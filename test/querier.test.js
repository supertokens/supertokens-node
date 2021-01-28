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
const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../");
let { Querier } = require("../lib/build/querier");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let Session = require("../recipe/session");
let nock = require("nock");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
let EmailPassword = require("../recipe/emailpassword");
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;

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

    // Test that if the querier throws an error from a recipe, that recipe's ID is there
    it("test that if the querier throws an error from a recipe, that recipe's ID is there", async function () {
        await startST();
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    enableAntiCsrf: true,
                }),
                EmailPassword.init(),
            ],
        });
        try {
            await Session.getAllSessionHandlesForUser();
            assert(false);
        } catch (err) {
            if (err.type !== ST.Error.GENERAL_ERROR || err.rId !== "session") {
                throw err;
            }
        }

        try {
            await EmailPassword.getUserByEmail();
            assert(false);
        } catch (err) {
            if (err.type !== ST.Error.GENERAL_ERROR || err.rId !== "emailpassword") {
                throw err;
            }
        }
    });

    // Check that once the API version is there, it doesn't need to query again
    it("test that if that once API version is there, it doesn't need to query again", async function () {
        await startST();
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });
        let q = Querier.getInstanceOrThrowError("");
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
        await startST();
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        let querier = Querier.getInstanceOrThrowError("test");

        nock("http://localhost:8080", {
            allowUnmocked: true,
        })
            .get("/recipe")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response = await querier.sendGetRequest(new NormalisedURLPath("", "/recipe"), {});
        assert(response.rid === "test");

        nock("http://localhost:8080", {
            allowUnmocked: true,
        })
            .get("/recipe/random")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response2 = await querier.sendGetRequest(new NormalisedURLPath("", "/recipe/random"), {});
        assert(response2.rid === "test");

        nock("http://localhost:8080", {
            allowUnmocked: true,
        })
            .get("/test")
            .reply(200, function (uri, requestBody) {
                return this.req.headers;
            });

        let response3 = await querier.sendGetRequest(new NormalisedURLPath("", "/test"), {});
        assert(response3.rid === undefined);
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
            recipeList: [
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });
        try {
            let q = Querier.getInstanceOrThrowError("");
            await q.sendGetRequest(new NormalisedURLPath("", "/"), {});
            throw new Error();
        } catch (err) {
            if (err.type !== ST.Error.GENERAL_ERROR || err.message !== "No SuperTokens core available to query") {
                throw err;
            }
        }
    });

    it("three cores and round robin", async function () {
        await startST();
        await startST("localhost", 8081);
        await startST("localhost", 8082);
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080;http://localhost:8081/;http://localhost:8082",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });
        let q = Querier.getInstanceOrThrowError("");
        assert.equal(await q.sendGetRequest(new NormalisedURLPath("", "/hello"), {}), "Hello\n");
        assert.equal(await q.sendDeleteRequest(new NormalisedURLPath("", "/hello"), {}), "Hello\n");
        let hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 3);
        assert.equal(await q.sendGetRequest(new NormalisedURLPath("", "/hello"), {}), "Hello\n"); // this will be the 4th API call
        hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 3);
        assert.equal(hostsAlive.has("http://localhost:8080"), true);
        assert.equal(hostsAlive.has("http://localhost:8081"), true);
        assert.equal(hostsAlive.has("http://localhost:8082"), true);
    });

    it("three cores, one dead and round robin", async function () {
        await startST();
        await startST("localhost", 8082);
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080;http://localhost:8081/;http://localhost:8082",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });
        let q = Querier.getInstanceOrThrowError("");
        assert.equal(await q.sendGetRequest(new NormalisedURLPath("", "/hello"), {}), "Hello\n");
        assert.equal(await q.sendPostRequest(new NormalisedURLPath("", "/hello"), {}), "Hello\n");
        let hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 2);
        assert.equal(await q.sendPutRequest(new NormalisedURLPath("", "/hello"), {}), "Hello\n"); // this will be the 4th API call
        hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 2);
        assert.equal(hostsAlive.has("http://localhost:8080"), true);
        assert.equal(hostsAlive.has("http://localhost:8081"), false);
        assert.equal(hostsAlive.has("http://localhost:8082"), true);
    });
});
