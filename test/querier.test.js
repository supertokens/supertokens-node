/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
let { ProcessState } = require("../lib/build/processState");
let Session = require("../recipe/session");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");

/**
 *
 * TODO: Test that if the querier throws an error from a recipe, that recipe's ID is there
 * TODO: Check that once the API version is there, it doesn't need to query again
 * TODO: Check that rid is added to the header iff it's a "/recipe" || "/recipe/*" request.
 */

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
            recipeList: [Session.init()],
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
            recipeList: [Session.init()],
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
            recipeList: [Session.init()],
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
