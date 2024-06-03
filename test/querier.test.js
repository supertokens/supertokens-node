/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig } = require("./utils");
let ST = require("../");
let { Querier } = require("../lib/build/querier");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let nock = require("nock");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
let EmailPassword = require("../recipe/emailpassword");
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;
const { fail } = require("assert");
const { default: fetch } = require("cross-fetch");

describe(`Querier: ${printPath("[test/querier.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // Check that once the API version is there, it doesn't need to query again
    it("test that if that once API version is there, it doesn't need to query again", async function () {
        const connectionURI = await startST();
        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        let q = Querier.getNewInstanceOrThrowError(undefined);
        await q.getAPIVersion();

        let verifyState = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION,
            2000
        );
        assert(verifyState !== undefined);

        ProcessState.getInstance().reset();

        await q.getAPIVersion();
        verifyState = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.CALLING_SERVICE_IN_GET_API_VERSION,
            2000
        );
        assert(verifyState === undefined);
    });

    // Check that rid is added to the header iff it's a "/recipe" || "/recipe/*" request.
    it("test that rid is added to the header if it's a recipe request", async function () {
        const connectionURI = await startST();
        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let querier = Querier.getNewInstanceOrThrowError(SessionRecipe.getInstanceOrThrowError().getRecipeId());

        nock(connectionURI, {
            allowUnmocked: true,
        })
            .get("/recipe")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe"), {}, {});
        assert.deepStrictEqual(response.rid, ["session"]);

        nock(connectionURI, {
            allowUnmocked: true,
        })
            .get("/recipe/random")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response2 = await querier.sendGetRequest(new NormalisedURLPath("/recipe/random"), {}, {});
        assert.deepStrictEqual(response2.rid, ["session"]);

        nock(connectionURI, {
            allowUnmocked: true,
        })
            .get("/test")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response3 = await querier.sendGetRequest(new NormalisedURLPath("/test"), {}, {});
        assert.strictEqual(response3.rid, undefined);
    });

    it("core not available", async function () {
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080;http://localhost:8081/",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        try {
            let q = Querier.getNewInstanceOrThrowError(undefined);
            await q.sendGetRequest(new NormalisedURLPath("", "/"), {}, {});
            throw new Error();
        } catch (err) {
            if (err.message !== "No SuperTokens core available to query") {
                throw err;
            }
        }
    });

    it("three cores and round robin", async function () {
        const connectionURI = await startST();
        await startST({ host: "localhost", port: 8081 });
        await startST({ host: "localhost", port: 8082 });

        ST.init({
            supertokens: {
                connectionURI: `${connectionURI};http://localhost:8081/;http://localhost:8082`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        let q = Querier.getNewInstanceOrThrowError(undefined);
        assert.equal(await q.sendGetRequest(new NormalisedURLPath("/hello"), {}, {}), "Hello\n");
        assert.equal(await q.sendDeleteRequest(new NormalisedURLPath("/hello"), {}, undefined, {}), "Hello\n");
        let hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 3);
        assert.equal(await q.sendGetRequest(new NormalisedURLPath("/hello"), {}, {}), "Hello\n"); // this will be the 4th API call
        hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 3);
        assert.equal(hostsAlive.has(connectionURI), true);
        assert.equal(hostsAlive.has("http://localhost:8081"), true);
        assert.equal(hostsAlive.has("http://localhost:8082"), true);
    });

    it("three cores, one dead and round robin", async function () {
        const connectionURI = await startST();
        await startST({ host: "localhost", port: 8082 });
        ST.init({
            supertokens: {
                connectionURI: `${connectionURI};http://localhost:8081/;http://localhost:8082`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        let q = Querier.getNewInstanceOrThrowError(undefined);
        assert.equal(await q.sendGetRequest(new NormalisedURLPath("/hello"), {}, {}), "Hello\n");
        assert.equal(await q.sendPostRequest(new NormalisedURLPath("/hello"), {}, {}), "Hello\n");
        let hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 2);
        assert.equal(await q.sendPutRequest(new NormalisedURLPath("/hello"), {}, {}), "Hello\n"); // this will be the 4th API call
        hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 2);
        assert.equal(hostsAlive.has(connectionURI), true);
        assert.equal(hostsAlive.has("http://localhost:8081"), false);
        assert.equal(hostsAlive.has("http://localhost:8082"), true);
    });

    it("test that no connectionURI given, but recipe used throws an error", async function () {
        const connectionURI = await startST();
        ST.init({
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        try {
            await Session.getSessionInformation("");
            assert(false);
        } catch (err) {
            assert(
                err.message ===
                    "No SuperTokens core available to query. Please pass supertokens > connectionURI to the init function, or override all the functions of the recipe you are using."
            );
        }
    });

    it("test that no connectionURI given, recipe override and used doesn't thrown an error", async function () {
        const connectionURI = await startST();
        ST.init({
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                getSessionInformation: async (input) => {
                                    return input.sessionHandle;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        assert((await Session.getSessionInformation("someHandle")) === "someHandle");
    });

    it("test with core base path", async function () {
        // first we need to know if the core used supports base_path config
        const connectionURI = await startST({ port: 8081, coreConfig: { base_path: "/test" } });

        try {
            const res = await fetch(`${connectionURI}/test/hello`);
            if (res.status === 404) {
                return;
            }
        } catch (error) {
            throw error;
        }

        ST.init({
            supertokens: {
                connectionURI: `${connectionURI}/test`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        // we query the core now
        let res = await Session.getAllSessionHandlesForUser("user1");
        assert(res.length === 0);
    });

    it("test with incorrect core base path should fail", async function () {
        // first we need to know if the core used supports base_path config
        const connectionURI = await startST({ port: 8081, coreConfig: { base_path: "/some/path" } });

        try {
            const res = await fetch(`${connectionURI}/some/path/hello`);
            if (res.status === 404) {
                return;
            }
        } catch (error) {
            if (error.response.status === 404) {
                //core must be an older version, so we return early
                return;
            }
            throw error;
        }

        ST.init({
            supertokens: {
                connectionURI: `${connectionURI}/test`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        try {
            // we query the core now
            await Session.getAllSessionHandlesForUser("user1", true, undefined, {
                doNotMock: true,
            });
            fail();
        } catch (err) {
            assert(err.message.startsWith("SuperTokens core threw an error"));
        }
    });

    it("test with multiple core base path", async function () {
        // first we need to know if the core used supports base_path config
        const connectionURI = await startST({ port: 8081, coreConfig: { base_path: "/some/path" } });

        try {
            const res = await fetch(`${connectionURI}/some/path/hello`);
            if (res.status === 404) {
                return;
            }
        } catch (error) {
            if (error.response.status === 404) {
                //core must be an older version, so we return early
                return;
            }
            throw error;
        }

        await startST({
            host: "localhost",
            port: 8082,
            coreConfig: {
                base_path: "/test",
            },
        });

        ST.init({
            supertokens: {
                connectionURI: `${connectionURI}/some/path;http://localhost:8082/test`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        {
            // we query the first core now
            let res = await Session.getAllSessionHandlesForUser("user1");
            assert(res.length === 0);
        }

        {
            // we query the second core now
            let res = await Session.getAllSessionHandlesForUser("user1");
            assert(res.length === 0);
        }
    });

    it("test that no-cache header is added when querying the core", async function () {
        const connectionURI = await startST();
        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let querier = Querier.getNewInstanceOrThrowError(SessionRecipe.getInstanceOrThrowError().getRecipeId());

        nock(connectionURI, {
            allowUnmocked: true,
        })
            .get("/recipe")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe"), {}, {});
        assert.deepStrictEqual(response.rid, ["session"]);
        let noCacheHeaderAdded = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.ADDING_NO_CACHE_HEADER_IN_FETCH,
            2000
        );
        assert(noCacheHeaderAdded !== undefined);
    });
});
