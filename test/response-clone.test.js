const assert = require("assert");
const http = require("http");
const ST = require("../");
const Session = require("../recipe/session");
const Dashboard = require("../recipe/dashboard");
const EmailPassword = require("../recipe/emailpassword");
const express = require("express");
const request = require("supertest");
const { middleware, errorHandler } = require("../framework/express");
const { getQuerierInstance, resetAll } = require("./utils");

const responseDeadlineMs = 5000;
// Node's built-in fetch delegates to Undici. Do not label a harness polyfill as native.
const nativeFetch =
    typeof globalThis.fetch === "function" && /undici/i.test(Function.prototype.toString.call(globalThis.fetch))
        ? globalThis.fetch
        : undefined;

// Separate writes exceed node-fetch v2's clone buffer, unlike a single buffered reply.
const payload = { status: "OK", nested: { value: "original" }, padding: "x".repeat(128 * 1024) };

async function deadline(operation) {
    let timer;
    try {
        return await Promise.race([
            operation,
            new Promise((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error(`Response body did not complete within ${responseDeadlineMs}ms`)),
                    responseDeadlineMs
                );
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}

async function startCore() {
    const sockets = new Set();
    const timers = new Set();
    const requests = [];
    let reply = () => ({ body: payload });
    const server = http.createServer((req, res) => {
        requests.push({ method: req.method, url: req.url });
        req.resume();
        res.setHeader("content-type", "application/json");
        if (new URL(req.url, "http://localhost").pathname === "/apiversion") {
            res.end(JSON.stringify({ versions: ["5.4"] }));
            return;
        }
        const response = reply(req);
        res.statusCode = response.status ?? 200;
        for (const [key, value] of Object.entries(response.headers ?? {})) res.setHeader(key, value);
        const body = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
        res.write(body.slice(0, 20000));
        const timer = setTimeout(() => {
            timers.delete(timer);
            res.end(body.slice(20000));
        }, 25);
        timers.add(timer);
    });
    server.on("connection", (socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return {
        url: `http://127.0.0.1:${server.address().port}`,
        requests,
        replyWith(handler) {
            reply = handler;
        },
        async close() {
            for (const timer of timers) clearTimeout(timer);
            for (const socket of sockets) socket.destroy();
            await new Promise((resolve) => server.close(resolve));
        },
    };
}

for (const mode of ["fallback", "native"]) {
    const describeFetch = mode === "native" && nativeFetch === undefined ? describe.skip : describe;
    describeFetch(`Chunked Core responses with ${mode} fetch`, function () {
        this.timeout(responseDeadlineMs * 4);
        let core;
        let originalFetch;

        beforeEach(async function () {
            resetAll();
            originalFetch = globalThis.fetch;
            globalThis.fetch = mode === "native" ? nativeFetch : undefined;
            core = await startCore();
        });

        afterEach(async function () {
            globalThis.fetch = originalFetch;
            await core.close();
            resetAll();
        });

        function init(disableCoreCallCache = false, recipes = [Session.init()]) {
            ST.init({
                supertokens: { connectionURI: core.url, disableCoreCallCache },
                appInfo: {
                    apiDomain: "http://localhost:3000",
                    appName: "test",
                    websiteDomain: "http://localhost:3001",
                },
                recipeList: recipes,
            });
            return getQuerierInstance();
        }

        for (const disableCache of [true, false]) {
            it(`completes chunked JSON with cache ${disableCache ? "disabled" : "enabled"}`, async function () {
                const querier = init(disableCache);

                const result = await deadline(querier.sendGetRequest("/fixture", {}, {}));

                assert.deepStrictEqual(result, payload);
            });
        }

        it("reuses a buffered response without sharing mutable objects between callers", async function () {
            const querier = init();
            const context = {};
            const first = await deadline(querier.sendGetRequest("/fixture", { b: 2, a: 1 }, context));
            first.nested.value = "changed";
            delete first.padding;

            const second = await deadline(querier.sendGetRequest("/fixture", { a: 1, b: 2 }, context));
            second.nested.value = "changed again";
            const third = await deadline(querier.sendGetRequest("/fixture", { a: 1, b: 2 }, context));

            assert.deepStrictEqual(third, payload);
            assert.strictEqual(core.requests.filter((req) => req.url.startsWith("/fixture")).length, 1);
        });

        it("does not cache across request contexts or distinct query parameters", async function () {
            const querier = init();
            const context = {};
            for (const [params, userContext] of [
                [{ page: 1 }, context],
                [{ page: 2 }, context],
                [{ page: 1 }, {}],
            ]) {
                assert.deepStrictEqual(
                    await deadline(querier.sendGetRequest("/fixture", params, userContext)),
                    payload
                );
            }
            assert.strictEqual(core.requests.filter((req) => req.url.startsWith("/fixture")).length, 3);
        });

        it("fetches each time when caching is disabled", async function () {
            const querier = init(true);
            const context = {};
            for (let i = 0; i < 2; i++) {
                assert.deepStrictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), payload);
            }
            assert.strictEqual(core.requests.filter((req) => req.url === "/fixture").length, 2);
        });

        for (const method of ["POST", "PUT", "DELETE"]) {
            it(`invalidates cached GETs after ${method} and consumes its chunked response`, async function () {
                const querier = init();
                const context = {};
                await deadline(querier.sendGetRequest("/fixture", {}, context));
                const updated = { ...payload, nested: { value: "updated" } };
                core.replyWith(() => ({ body: updated }));

                const mutation =
                    method === "POST"
                        ? querier.sendPostRequest("/fixture", {}, context)
                        : method === "PUT"
                        ? querier.sendPutRequest("/fixture", {}, {}, context)
                        : querier.sendDeleteRequest("/fixture", {}, {}, context);
                assert.deepStrictEqual(await deadline(mutation), updated);
                assert.deepStrictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), updated);
                assert.deepStrictEqual(
                    core.requests.filter((req) => req.url === "/fixture").map((req) => req.method),
                    ["GET", method, "GET"]
                );
            });
        }

        it("preserves chunked text and caches it for repeated reads", async function () {
            core.replyWith(() => ({ body: payload.padding, headers: { "content-type": "text/plain; charset=utf-8" } }));
            const querier = init();
            const context = {};
            assert.strictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), payload.padding);
            assert.strictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), payload.padding);
            assert.strictEqual(core.requests.filter((req) => req.url === "/fixture").length, 1);
        });

        it("returns response headers alongside the complete JSON body", async function () {
            core.replyWith(() => ({ body: payload, headers: { "x-fixture": "preserved" } }));
            const querier = init();

            const result = await deadline(querier.sendGetRequestWithResponseHeaders("/fixture", {}, undefined, {}));

            assert.deepStrictEqual(result.body, payload);
            assert.strictEqual(result.headers.get("x-fixture"), "preserved");
            assert.strictEqual(result.headers.get("content-type"), "application/json");
        });

        it("reports the full error body and does not cache failed GETs", async function () {
            const querier = init();
            const context = {};
            core.replyWith(() => ({ status: 400, body: payload.padding }));

            await assert.rejects(deadline(querier.sendGetRequest("/fixture", {}, context)), {
                message:
                    "SuperTokens core threw an error for a GET request to path: '/fixture' with status code: 400 and message: " +
                    payload.padding,
            });
            core.replyWith(() => ({ body: payload }));
            assert.deepStrictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), payload);
            assert.strictEqual(core.requests.filter((req) => req.url === "/fixture").length, 2);
        });

        it("retries a rate-limited request and caches only the successful response", async function () {
            const querier = init();
            const context = {};
            let attempts = 0;
            core.replyWith(() => (++attempts === 1 ? { status: 429, body: "retry" } : { body: payload }));

            assert.deepStrictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), payload);
            assert.deepStrictEqual(await deadline(querier.sendGetRequest("/fixture", {}, context)), payload);
            assert.strictEqual(attempts, 2);
        });

        it("serves the dashboard tenant-list route from a chunked Core response", async function () {
            const tenants = Array.from({ length: 2000 }, (_, index) => ({
                tenantId: `tenant-${index}`,
                firstFactors: ["emailpassword"],
                thirdParty: { providers: [] },
                coreConfig: {},
            }));
            core.replyWith(() => ({ body: { status: "OK", tenants } }));
            init(false, [Session.init(), EmailPassword.init(), Dashboard.init({ apiKey: "local-fixture-key" })]);
            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const response = await request(app)
                .get("/auth/dashboard/api/tenants")
                .set("authorization", "Bearer local-fixture-key")
                .timeout({ deadline: responseDeadlineMs });

            assert.strictEqual(response.status, 200);
            assert.deepStrictEqual(response.body, {
                status: "OK",
                tenants: tenants.map(({ tenantId }) => ({ tenantId, firstFactors: ["emailpassword"] })),
            });
            assert.strictEqual(
                core.requests.filter((req) => req.url === "/recipe/multitenancy/tenant/list/v2").length,
                1
            );
        });
    });
}
