/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
const { printPath, createCoreApplication } = require("../utils");
let assert = require("assert");
let STExpress = require("../../");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let ThirdParty = require("../../lib/build/recipe/thirdparty");
const {
    createRetryingRemoteJWKSet,
    parseRetryAfterMs,
    JWKS_MAX_ATTEMPTS,
    JWKS_BACKOFF_MS,
    __testInternals,
} = require("../../lib/build/recipe/thirdparty/jwksFetch");
const { fetchJWKSWithRetries, resolveOptions, isAppleCanonicalKeysURL, isTransientTransportError } = __testInternals;
const http = require("http");
const { generateKeyPair, exportJWK, SignJWT } = require("jose");

// A controllable virtual clock. `sleep` advances it, so the retry engine's
// deadline/backoff logic runs deterministically without any real waiting.
function makeClock(start = 0) {
    let t = start;
    const sleeps = [];
    return {
        now: () => t,
        sleep: async (ms) => {
            sleeps.push(ms);
            t += ms;
        },
        advance: (ms) => {
            t += ms;
        },
        sleeps,
    };
}

// A transport that plays a scripted list of steps. Each step is either
// { status, headers?, body?, advanceMs? } or { throw: Error, advanceMs? }.
// When calls outrun the script, the last step repeats (useful for "always 503").
function scriptedTransport(clock, steps) {
    const calls = [];
    async function transport(url, { timeoutMs }) {
        const idx = Math.min(calls.length, steps.length - 1);
        const call = { url: url.toString(), timeoutMs, at: clock.now(), discarded: false };
        calls.push(call);
        const step = steps[idx];
        if (step.advanceMs) {
            clock.advance(step.advanceMs);
        }
        if (step.throw) {
            throw step.throw;
        }
        const headers = step.headers || {};
        return {
            status: step.status,
            getHeader: (n) => {
                const key = Object.keys(headers).find((h) => h.toLowerCase() === n.toLowerCase());
                return key === undefined ? null : headers[key];
            },
            readBody: async () => step.body || "",
            discardBody: async () => {
                call.discarded = true;
            },
        };
    }
    transport.calls = calls;
    return transport;
}

function transientError(code) {
    const e = new Error(`transport ${code}`);
    e.code = code;
    return e;
}

const JWKS_URL = "https://provider.example.com/jwks";

describe(`thirdPartyJWKSRetryTest: ${printPath("[test/thirdparty/jwksRetry.test.js]")}`, function () {
    // --- Retry engine (no core, deterministic clock/transport) --------------
    describe("retry engine", function () {
        function run(steps, { url = JWKS_URL, jitter = () => 0 } = {}) {
            const clock = makeClock();
            const transport = scriptedTransport(clock, steps);
            const opts = resolveOptions({ transport, now: clock.now, sleep: clock.sleep, jitter });
            return { clock, transport, opts, promise: fetchJWKSWithRetries(new URL(url), opts) };
        }

        async function expectReject(steps, options) {
            const { transport, clock, promise } = run(steps, options);
            let err;
            await promise.then(
                () => {},
                (e) => {
                    err = e;
                }
            );
            assert.ok(err !== undefined, "expected the refresh to reject");
            return { err, calls: transport.calls, clock };
        }

        async function expectResolve(steps, options) {
            const { transport, clock, promise } = run(steps, options);
            const result = await promise;
            return { result, calls: transport.calls, clock };
        }

        it("recovers when a retryable failure is followed by valid keys", async function () {
            const { result, calls, clock } = await expectResolve([
                { status: 503 },
                { status: 200, body: JSON.stringify({ keys: [{ kid: "a" }] }) },
            ]);
            assert.strictEqual(result.keys.length, 1);
            assert.strictEqual(calls.length, 2, "one failed then one successful fetch");
            assert.deepStrictEqual(clock.sleeps, [JWKS_BACKOFF_MS[0]], "backoff before the second attempt only");
            assert.strictEqual(calls[0].discarded, true, "the failed response body must be released");
        });

        it("retries every retryable HTTP status", async function () {
            for (const status of [408, 429, 500, 502, 503, 504]) {
                const { result, calls } = await expectResolve([
                    { status },
                    { status: 200, body: JSON.stringify({ keys: [] }) },
                ]);
                assert.ok(result.keys, `status ${status} should recover`);
                assert.strictEqual(calls.length, 2, `status ${status} should be retried once`);
            }
        });

        it("does not retry non-retryable HTTP statuses (incl. redirects)", async function () {
            for (const status of [301, 302, 307, 400, 401, 403, 404, 410]) {
                const { err, calls } = await expectReject([
                    { status },
                    { status: 200, body: JSON.stringify({ keys: [] }) },
                ]);
                assert.strictEqual(calls.length, 1, `status ${status} must fail immediately`);
                assert.strictEqual(err.status, status);
                assert.strictEqual(calls[0].discarded, true, `status ${status} body must be released`);
            }
        });

        it("does not retry a 200 with a malformed JSON or non-JWKS body", async function () {
            const malformedJson = await expectReject([
                { status: 200, body: "this is not json" },
                { status: 200, body: JSON.stringify({ keys: [] }) },
            ]);
            assert.strictEqual(malformedJson.calls.length, 1);

            const notAJwks = await expectReject([
                { status: 200, body: JSON.stringify({ notKeys: true }) },
                { status: 200, body: JSON.stringify({ keys: [] }) },
            ]);
            assert.strictEqual(notAJwks.calls.length, 1);
        });

        it("classifies transport errors narrowly", function () {
            for (const code of ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"]) {
                assert.strictEqual(isTransientTransportError(transientError(code)), true, `${code} is transient`);
            }
            // fetch wraps the real cause; a transient cause code still counts.
            const wrapped = new TypeError("fetch failed");
            wrapped.cause = transientError("ECONNRESET");
            assert.strictEqual(isTransientTransportError(wrapped), true, "transient cause code is honored");
            // Anything else is permanent — including a bare TypeError.
            for (const code of ["ENOTFOUND", "ERR_TLS_CERT_ALTNAME_INVALID", "ERR_INVALID_URL"]) {
                assert.strictEqual(isTransientTransportError(transientError(code)), false, `${code} is permanent`);
            }
            assert.strictEqual(isTransientTransportError(new TypeError("fetch failed")), false, "bare TypeError");
            assert.strictEqual(isTransientTransportError({ transient: true }), true, "explicit transient tag");
        });

        it("retries transient transport failures but not permanent ones", async function () {
            const transient = await expectResolve([
                { throw: transientError("ECONNRESET") },
                { status: 200, body: JSON.stringify({ keys: [] }) },
            ]);
            assert.strictEqual(transient.calls.length, 2, "ECONNRESET should be retried");

            for (const code of ["ENOTFOUND", "ERR_TLS_CERT_ALTNAME_INVALID", "ERR_INVALID_URL"]) {
                const permanent = await expectReject([
                    { throw: transientError(code) },
                    { status: 200, body: JSON.stringify({ keys: [] }) },
                ]);
                assert.strictEqual(permanent.calls.length, 1, `${code} must fail immediately`);
            }
        });

        it("bounds retries to three attempts", async function () {
            const { err, calls, clock } = await expectReject([{ status: 503 }]);
            assert.strictEqual(calls.length, JWKS_MAX_ATTEMPTS, "at most three attempts");
            assert.strictEqual(err.status, 503);
            assert.deepStrictEqual(clock.sleeps, JWKS_BACKOFF_MS, "backoff before attempts two and three");
        });

        it("stops attempting once the deadline is reached", async function () {
            // Each request burns 2.5s, so the third attempt cannot fit in the 5s budget.
            const { calls } = await expectReject([{ status: 503, advanceMs: 2500 }]);
            assert.strictEqual(calls.length, 2, "the doomed third attempt is skipped");
        });

        describe("Retry-After", function () {
            it("waits at least the Retry-After duration (seconds)", async function () {
                const { calls, clock } = await expectResolve([
                    { status: 503, headers: { "Retry-After": "1" } },
                    { status: 200, body: JSON.stringify({ keys: [] }) },
                ]);
                assert.strictEqual(calls.length, 2);
                assert.deepStrictEqual(clock.sleeps, [1000], "Retry-After (1s) overrides the 200ms backoff floor");
            });

            it("fails without retrying when Retry-After leaves no time in the deadline", async function () {
                const { calls } = await expectReject([{ status: 503, headers: { "Retry-After": "10" } }]);
                assert.strictEqual(calls.length, 1, "a 10s Retry-After exceeds the 5s deadline: no second attempt");
            });

            it("parses seconds, HTTP dates, past dates and invalid values", function () {
                const now = 1_000_000;
                assert.strictEqual(parseRetryAfterMs("5", now), 5000);
                assert.strictEqual(parseRetryAfterMs("0", now), 0);
                assert.strictEqual(parseRetryAfterMs(null, now), undefined);
                assert.strictEqual(parseRetryAfterMs("   ", now), undefined);
                assert.strictEqual(parseRetryAfterMs("not-a-date", now), undefined);
                // A past HTTP date normalises to 0.
                assert.strictEqual(parseRetryAfterMs(new Date(now - 5000).toUTCString(), now), 0);
                // A future HTTP date is the delta (HTTP dates have 1s resolution).
                const futureMs = parseRetryAfterMs(new Date(now + 3000).toUTCString(), now);
                assert.ok(futureMs >= 2000 && futureMs <= 3000, `expected ~3000, got ${futureMs}`);
            });
        });

        describe("Apple 404 exception", function () {
            it("identifies only the canonical Apple keys URL", function () {
                assert.strictEqual(isAppleCanonicalKeysURL(new URL("https://appleid.apple.com/auth/keys")), true);
                assert.strictEqual(isAppleCanonicalKeysURL(new URL("https://appleid.apple.com/auth/keys?x=1")), false);
                assert.strictEqual(isAppleCanonicalKeysURL(new URL("http://appleid.apple.com/auth/keys")), false);
                assert.strictEqual(isAppleCanonicalKeysURL(new URL("https://appleid.apple.com/auth/keys2")), false);
                assert.strictEqual(isAppleCanonicalKeysURL(new URL("https://evil.example.com/auth/keys")), false);
                assert.strictEqual(
                    isAppleCanonicalKeysURL(new URL("https://user:pw@appleid.apple.com/auth/keys")),
                    false
                );
            });

            it("retries a 404 for the canonical Apple keys URL", async function () {
                const { calls } = await expectResolve(
                    [{ status: 404 }, { status: 200, body: JSON.stringify({ keys: [] }) }],
                    { url: "https://appleid.apple.com/auth/keys" }
                );
                assert.strictEqual(calls.length, 2, "Apple's 404 is retried");
            });

            it("does not retry a 404 for other endpoints", async function () {
                const { calls } = await expectReject(
                    [{ status: 404 }, { status: 200, body: JSON.stringify({ keys: [] }) }],
                    { url: "https://provider.example.com/auth/keys" }
                );
                assert.strictEqual(calls.length, 1);
            });
        });
    });

    // --- Resolver semantics (freshness/cooldown/coalescing with real keys) ---
    describe("resolver", function () {
        let publicJWK;
        const kid = "test-kid-1";

        before(async function () {
            const kp = await generateKeyPair("RS256");
            publicJWK = await exportJWK(kp.publicKey);
            publicJWK.kid = kid;
            publicJWK.alg = "RS256";
            publicJWK.use = "sig";
        });

        function makeResolver(clock, steps) {
            const transport = scriptedTransport(clock, steps);
            const resolver = createRetryingRemoteJWKSet(new URL(JWKS_URL), {
                transport,
                now: clock.now,
                sleep: clock.sleep,
                jitter: () => 0,
            });
            return { resolver, transport };
        }

        it("coalesces concurrent callers into a single shared refresh sequence", async function () {
            const clock = makeClock();
            const { resolver, transport } = makeResolver(clock, [
                { status: 503 },
                { status: 200, body: JSON.stringify({ keys: [publicJWK] }) },
            ]);
            const header = { alg: "RS256", kid };
            const keys = await Promise.all([resolver(header), resolver(header), resolver(header)]);
            for (const k of keys) {
                assert.ok(k, "every concurrent caller receives the key");
            }
            assert.strictEqual(transport.calls.length, 2, "three concurrent callers share one 503+200 refresh");
        });

        it("an abandoned caller does not abort a refresh other callers still need", async function () {
            const clock = makeClock();
            const { resolver, transport } = makeResolver(clock, [
                { status: 200, body: JSON.stringify({ keys: [publicJWK] }) },
            ]);
            const header = { alg: "RS256", kid };
            const abandoned = resolver(header); // never awaited by anyone waiting on it
            abandoned.catch(() => {}); // avoid unhandled rejection warnings if it ever were to reject
            const wanted = await resolver(header);
            assert.ok(wanted, "the surviving caller still resolves");
            assert.strictEqual(transport.calls.length, 1, "the shared refresh completed once");
            await abandoned; // it too resolves from the same shared refresh
        });

        it("does not refetch on an unknown key id while cooling down, but refetches after cooldown", async function () {
            const clock = makeClock();
            const { resolver, transport } = makeResolver(clock, [
                { status: 200, body: JSON.stringify({ keys: [publicJWK] }) },
            ]);
            await resolver({ alg: "RS256", kid });
            assert.strictEqual(transport.calls.length, 1);

            // Unknown kid within the 30s cooldown: no extra fetch.
            await assert.rejects(resolver({ alg: "RS256", kid: "unknown" }));
            assert.strictEqual(transport.calls.length, 1, "unknown kid during cooldown must not refetch");

            // After the cooldown window, an unknown kid triggers exactly one refresh.
            clock.advance(31 * 1000);
            await assert.rejects(resolver({ alg: "RS256", kid: "unknown" }));
            assert.strictEqual(transport.calls.length, 2, "unknown kid after cooldown refetches once");
        });

        it("refetches rotated keys once the cache is stale", async function () {
            const clock = makeClock();
            const rotatedKp = await generateKeyPair("RS256");
            const rotatedJWK = await exportJWK(rotatedKp.publicKey);
            rotatedJWK.kid = "test-kid-2";
            rotatedJWK.alg = "RS256";
            rotatedJWK.use = "sig";

            const { resolver, transport } = makeResolver(clock, [
                { status: 200, body: JSON.stringify({ keys: [publicJWK] }) },
                { status: 200, body: JSON.stringify({ keys: [rotatedJWK] }) },
            ]);
            await resolver({ alg: "RS256", kid });
            assert.strictEqual(transport.calls.length, 1);

            // Within the cache window the old key set is reused (no fetch), and the
            // rotated kid is unknown + cooling down, so still no fetch.
            await assert.rejects(resolver({ alg: "RS256", kid: "test-kid-2" }));
            assert.strictEqual(transport.calls.length, 1);

            // Past the 10-minute cache age, the next lookup refreshes and finds the rotated key.
            clock.advance(11 * 60 * 1000);
            const rotatedKey = await resolver({ alg: "RS256", kid: "test-kid-2" });
            assert.ok(rotatedKey);
            assert.strictEqual(transport.calls.length, 2, "a stale cache refetches exactly once");
        });
    });

    // --- End-to-end through the real provider path (requires a running core) -
    describe("provider verification with retries", function () {
        let server;
        let port;
        let jwksHits;
        let jwksScript; // (res) => void, decides how each /jwks request responds
        let tokenHits;
        let publicJWK;
        let privateKey;
        let otherPrivateKey;

        before(async function () {
            const kid = "test-kid-1";
            const kp = await generateKeyPair("RS256");
            privateKey = kp.privateKey;
            publicJWK = await exportJWK(kp.publicKey);
            publicJWK.kid = kid;
            publicJWK.alg = "RS256";
            publicJWK.use = "sig";

            const otherKp = await generateKeyPair("RS256");
            otherPrivateKey = otherKp.privateKey;

            server = http.createServer((req, res) => {
                if (req.method === "POST" && req.url.startsWith("/token")) {
                    tokenHits++;
                    // Drain the request body before responding.
                    req.on("data", () => {});
                    req.on("end", () => {
                        res.setHeader("content-type", "application/json");
                        res.end(JSON.stringify({ access_token: "at", id_token: server.__idToken }));
                    });
                    return;
                }
                if (req.url.startsWith("/jwks")) {
                    jwksHits++;
                    jwksScript(res);
                    return;
                }
                res.statusCode = 404;
                res.end();
            });
            await new Promise((resolve) => server.listen(0, resolve));
            port = server.address().port;
        });

        after(function () {
            if (server) {
                server.close();
            }
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
            jwksHits = 0;
            tokenHits = 0;
            jwksScript = (res) => {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify({ keys: [publicJWK] }));
            };
        });

        function serveKeys(res) {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ keys: [publicJWK] }));
        }

        function jwksURI() {
            return `http://localhost:${port}/jwks`;
        }

        function tokenURI() {
            return `http://localhost:${port}/token`;
        }

        async function signIdToken({ audience, signingKey = privateKey, kid = "test-kid-1" }) {
            return await new SignJWT({ email: "user@example.com", email_verified: true })
                .setProtectedHeader({ alg: "RS256", kid })
                .setSubject("thirdparty-user-1")
                .setIssuedAt()
                .setExpirationTime("1h")
                .setAudience(audience)
                .sign(signingKey);
        }

        function initST() {
            STExpress.init({
                supertokens: { connectionURI: this.connectionURI },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    ThirdPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "custom",
                                        tokenEndpoint: tokenURI(),
                                        jwksURI: jwksURI(),
                                        clients: [{ clientId: "client-a" }],
                                    },
                                },
                            ],
                        },
                    }),
                ],
            });
        }

        it("recovers a sign-in when the JWKS endpoint fails transiently then succeeds", async function () {
            this.timeout(20000);
            this.connectionURI = await createCoreApplication();
            initST.call(this);

            let hit = 0;
            jwksScript = (res) => {
                hit++;
                if (hit === 1) {
                    res.statusCode = 503;
                    res.end();
                } else {
                    serveKeys(res);
                }
            };

            const idToken = await signIdToken({ audience: "client-a" });
            const provider = await ThirdParty.getProvider("public", "custom");
            const info = await provider.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} });
            assert.strictEqual(info.thirdPartyUserId, "thirdparty-user-1");
            assert.strictEqual(jwksHits, 2, "one transient failure then one successful fetch");
        });

        it("remains an authentication failure when the JWKS endpoint fails persistently", async function () {
            this.timeout(20000);
            this.connectionURI = await createCoreApplication();
            initST.call(this);

            jwksScript = (res) => {
                res.statusCode = 503;
                res.end();
            };

            const idToken = await signIdToken({ audience: "client-a" });
            const provider = await ThirdParty.getProvider("public", "custom");
            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} }),
                "persistent JWKS failure must remain an authentication failure"
            );
            assert.strictEqual(jwksHits, JWKS_MAX_ATTEMPTS, "bounded to three attempts");
        });

        it("does not repeat the authorization-code exchange when JWKS recovers", async function () {
            this.timeout(20000);
            this.connectionURI = await createCoreApplication();
            initST.call(this);

            server.__idToken = await signIdToken({ audience: "client-a" });
            let hit = 0;
            jwksScript = (res) => {
                hit++;
                if (hit === 1) {
                    res.statusCode = 503;
                    res.end();
                } else {
                    serveKeys(res);
                }
            };

            const provider = await ThirdParty.getProvider("public", "custom");
            const tokens = await provider.exchangeAuthCodeForOAuthTokens({
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "http://localhost/callback",
                    redirectURIQueryParams: { code: "auth-code-1" },
                },
                userContext: {},
            });
            assert.strictEqual(tokenHits, 1, "the token endpoint is called once");

            const info = await provider.getUserInfo({ oAuthTokens: tokens, userContext: {} });
            assert.strictEqual(info.thirdPartyUserId, "thirdparty-user-1");
            // The JWKS retry recovered (2 hits) without the SDK re-exchanging the auth code.
            assert.strictEqual(jwksHits, 2, "JWKS fetched twice (one retry)");
            assert.strictEqual(tokenHits, 1, "the auth code is exchanged exactly once");
        });

        it("does not retry the JWKS fetch on an invalid-signature token", async function () {
            this.timeout(20000);
            this.connectionURI = await createCoreApplication();
            initST.call(this);

            // Valid keys are always served; the token is simply forged.
            const forgedToken = await signIdToken({ audience: "client-a", signingKey: otherPrivateKey });
            const provider = await ThirdParty.getProvider("public", "custom");
            await assert.rejects(provider.getUserInfo({ oAuthTokens: { id_token: forgedToken }, userContext: {} }));
            assert.strictEqual(jwksHits, 1, "a signature failure is not a transport failure: no retries");
        });
    });
});
