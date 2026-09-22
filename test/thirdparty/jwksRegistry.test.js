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
    default: ThirdPartyJWKSResolvers,
    MAX_JWKS_REGISTRY_ENTRIES,
} = require("../../lib/build/recipe/thirdparty/jwks");
const http = require("http");
const { generateKeyPair, exportJWK, SignJWT } = require("jose");

describe(`thirdPartyJWKSRegistryTest: ${printPath("[test/thirdparty/jwksRegistry.test.js]")}`, function () {
    // Unit tests for the bounded registry itself. A counting factory stands in for JOSE's
    // createRemoteJWKSet so we can assert exactly when a new resolver is constructed.
    describe("registry", function () {
        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        function countingRegistry() {
            let created = [];
            const registry = new ThirdPartyJWKSResolvers((url) => {
                created.push(url.toString());
                // Return a distinct function identity per construction so callers can compare.
                const resolver = async () => {};
                resolver.__url = url.toString();
                return resolver;
            });
            return { registry, created };
        }

        it("reuses one resolver for the same endpoint across acquisitions", function () {
            const { registry, created } = countingRegistry();

            const first = registry.getResolver("https://provider.example.com/jwks");
            const second = registry.getResolver("https://provider.example.com/jwks");

            assert.strictEqual(first, second, "same URL must return the identical resolver instance");
            assert.strictEqual(created.length, 1, "the resolver must be constructed exactly once");
            assert.strictEqual(registry.size, 1);
        });

        it("keeps different endpoints isolated", function () {
            const { registry, created } = countingRegistry();

            const a = registry.getResolver("https://a.example.com/jwks");
            const b = registry.getResolver("https://b.example.com/jwks");

            assert.notStrictEqual(a, b);
            assert.strictEqual(created.length, 2);
            assert.strictEqual(registry.size, 2);
        });

        it("treats query parameters as part of the endpoint identity but ignores the fragment", function () {
            const { registry, created } = countingRegistry();

            const withoutQuery = registry.getResolver("https://provider.example.com/jwks");
            const withQuery = registry.getResolver("https://provider.example.com/jwks?tenant=1");
            const withFragment = registry.getResolver("https://provider.example.com/jwks#frag");

            // The query-bearing URL is a distinct entry.
            assert.notStrictEqual(withoutQuery, withQuery);
            // The fragment is stripped, so it collapses onto the no-query entry.
            assert.strictEqual(withoutQuery, withFragment);
            assert.strictEqual(created.length, 2);
            assert.strictEqual(registry.size, 2);
        });

        it("selects a new entry when the JWKS URI changes", function () {
            const { registry, created } = countingRegistry();

            registry.getResolver("https://provider.example.com/jwks/v1");
            registry.getResolver("https://provider.example.com/jwks/v2");

            assert.strictEqual(created.length, 2);
            assert.strictEqual(registry.size, 2);
        });

        it("bounds the number of retained resolvers with LRU eviction", function () {
            const { registry, created } = countingRegistry();

            for (let i = 0; i < MAX_JWKS_REGISTRY_ENTRIES; i++) {
                registry.getResolver(`https://provider.example.com/jwks/${i}`);
            }
            assert.strictEqual(registry.size, MAX_JWKS_REGISTRY_ENTRIES);
            assert.strictEqual(created.length, MAX_JWKS_REGISTRY_ENTRIES);

            // Adding one more evicts the least-recently-used entry (index 0), keeping the bound.
            registry.getResolver("https://provider.example.com/jwks/overflow");
            assert.strictEqual(registry.size, MAX_JWKS_REGISTRY_ENTRIES);
            assert.strictEqual(created.length, MAX_JWKS_REGISTRY_ENTRIES + 1);

            // Re-acquiring the evicted entry rebuilds it (proof it was dropped).
            registry.getResolver("https://provider.example.com/jwks/0");
            assert.strictEqual(created.length, MAX_JWKS_REGISTRY_ENTRIES + 2);
            assert.strictEqual(registry.size, MAX_JWKS_REGISTRY_ENTRIES);
        });

        it("refreshes recency on access so a recently-used entry survives eviction", function () {
            const { registry, created } = countingRegistry();

            for (let i = 0; i < MAX_JWKS_REGISTRY_ENTRIES; i++) {
                registry.getResolver(`https://provider.example.com/jwks/${i}`);
            }

            // Touch entry 0 so it becomes most-recently-used; entry 1 is now the LRU.
            const zero = registry.getResolver("https://provider.example.com/jwks/0");

            // Adding a new entry should evict entry 1, not entry 0.
            registry.getResolver("https://provider.example.com/jwks/overflow");

            const createdBefore = created.length;
            const zeroAgain = registry.getResolver("https://provider.example.com/jwks/0");
            assert.strictEqual(zeroAgain, zero, "recently-used entry 0 must not have been evicted");
            assert.strictEqual(created.length, createdBefore, "entry 0 must not be rebuilt");

            // Entry 1 was evicted, so re-acquiring it rebuilds.
            registry.getResolver("https://provider.example.com/jwks/1");
            assert.strictEqual(created.length, createdBefore + 1);
        });
    });

    // End-to-end tests exercising the real provider verification path against a controlled local
    // JWKS server with genuinely signed tokens. These require a running core (for getProvider).
    describe("provider verification", function () {
        let server;
        let port;
        let jwksHits;
        let publicJWK;
        let privateKey;
        let otherPrivateKey; // a different key sharing the same kid, for signature-failure tests

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
                if (req.url.startsWith("/jwks")) {
                    jwksHits++;
                    res.setHeader("content-type", "application/json");
                    res.end(JSON.stringify({ keys: [publicJWK] }));
                } else {
                    res.statusCode = 404;
                    res.end();
                }
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
        });

        function jwksURI() {
            return `http://localhost:${port}/jwks`;
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

        it("separate provider instances reuse fresh keys with a single JWKS fetch", async function () {
            const connectionURI = await createCoreApplication();
            this.connectionURI = connectionURI;
            initST.call(this);

            const idToken = await signIdToken({ audience: "client-a" });

            // getProvider builds a fresh provider per call — this is exactly the per-request
            // construction that previously defeated caching.
            const provider1 = await ThirdParty.getProvider("public", "custom");
            const info1 = await provider1.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} });
            assert.strictEqual(info1.thirdPartyUserId, "thirdparty-user-1");
            assert.strictEqual(info1.email.id, "user@example.com");

            const provider2 = await ThirdParty.getProvider("public", "custom");
            const info2 = await provider2.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} });
            assert.strictEqual(info2.thirdPartyUserId, "thirdparty-user-1");

            assert.notStrictEqual(provider1, provider2, "each getProvider call must build a distinct provider");
            assert.strictEqual(jwksHits, 1, "the JWKS endpoint must be fetched exactly once across both requests");
        });

        it("concurrent verifications share a single refresh", async function () {
            const connectionURI = await createCoreApplication();
            this.connectionURI = connectionURI;
            initST.call(this);

            const idToken = await signIdToken({ audience: "client-a" });

            const providers = await Promise.all([
                ThirdParty.getProvider("public", "custom"),
                ThirdParty.getProvider("public", "custom"),
                ThirdParty.getProvider("public", "custom"),
            ]);

            const results = await Promise.all(
                providers.map((p) => p.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} }))
            );

            for (const r of results) {
                assert.strictEqual(r.thirdPartyUserId, "thirdparty-user-1");
            }
            assert.strictEqual(jwksHits, 1, "concurrent refreshes must be coalesced into one fetch");
        });

        it("enforces each client's audience even when the endpoint is shared", async function () {
            const connectionURI = await createCoreApplication();
            this.connectionURI = connectionURI;
            initST.call(this);

            // First a valid verification to populate the shared cache.
            const validToken = await signIdToken({ audience: "client-a" });
            const provider = await ThirdParty.getProvider("public", "custom");
            await provider.getUserInfo({ oAuthTokens: { id_token: validToken }, userContext: {} });
            assert.strictEqual(jwksHits, 1);

            // A token minted for a different audience must be rejected, using cached keys (no refetch).
            const wrongAudienceToken = await signIdToken({ audience: "someone-else" });
            const provider2 = await ThirdParty.getProvider("public", "custom");
            await assert.rejects(
                provider2.getUserInfo({ oAuthTokens: { id_token: wrongAudienceToken }, userContext: {} })
            );
            assert.strictEqual(jwksHits, 1, "audience failure must not trigger another key fetch");
        });

        it("rejects tokens with an invalid signature without extra fetches", async function () {
            const connectionURI = await createCoreApplication();
            this.connectionURI = connectionURI;
            initST.call(this);

            const goodToken = await signIdToken({ audience: "client-a" });
            const provider = await ThirdParty.getProvider("public", "custom");
            await provider.getUserInfo({ oAuthTokens: { id_token: goodToken }, userContext: {} });
            assert.strictEqual(jwksHits, 1);

            // Signed with a different key but the same kid: the cached key won't verify it.
            const forgedToken = await signIdToken({ audience: "client-a", signingKey: otherPrivateKey });
            const provider2 = await ThirdParty.getProvider("public", "custom");
            await assert.rejects(provider2.getUserInfo({ oAuthTokens: { id_token: forgedToken }, userContext: {} }));
        });

        it("releases registry state on SDK reset so a fresh instance refetches keys", async function () {
            const connectionURI = await createCoreApplication();
            this.connectionURI = connectionURI;
            initST.call(this);

            const idToken = await signIdToken({ audience: "client-a" });
            const provider = await ThirdParty.getProvider("public", "custom");
            await provider.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} });
            assert.strictEqual(jwksHits, 1);

            // Tear down and re-initialise the SDK: the old registry (and its cached keys) must be gone.
            const { resetAll } = require("../utils");
            resetAll();
            ProcessState.getInstance().reset();
            initST.call(this);

            const provider2 = await ThirdParty.getProvider("public", "custom");
            await provider2.getUserInfo({ oAuthTokens: { id_token: idToken }, userContext: {} });
            assert.strictEqual(jwksHits, 2, "a reset SDK instance must build a new resolver and refetch keys");
        });
    });
});
