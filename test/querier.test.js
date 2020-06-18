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
let ST = require("../lib/build/session");
let { Querier } = require("../lib/build/querier");
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");

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

    it("querier called without init", async function () {
        Querier.getInstance();
    });

    it("core not available", async function () {
        ST.init({ hosts: "http://localhost:8080;http://localhost:8081/" });
        try {
            let q = Querier.getInstance();
            await q.sendGetRequest("/", {});
            throw new Error();
        } catch (err) {
            if (
                !ST.Error.isErrorFromAuth(err) ||
                err.errType !== ST.Error.GENERAL_ERROR ||
                err.err.message !== "No SuperTokens core available to query"
            ) {
                throw err;
            }
        }
    });

    it("three cores and round robin", async function () {
        await startST();
        await startST("localhost", 8081);
        await startST("localhost", 8082);
        ST.init({ hosts: "http://localhost:8080;http://localhost:8081/;http://localhost:8082" });
        let q = Querier.getInstance();
        assert.equal(await q.sendGetRequest("/hello", {}), "Hello\n");
        assert.equal(await q.sendDeleteRequest("/hello", {}), "Hello\n");
        let hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 3);
        assert.equal(await q.sendGetRequest("/hello", {}), "Hello\n"); // this will be the 4th API call
        hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 3);
        assert.equal(hostsAlive.has("http://localhost:8080"), true);
        assert.equal(hostsAlive.has("http://localhost:8081"), true);
        assert.equal(hostsAlive.has("http://localhost:8082"), true);
    });

    it("three cores, one dead and round robin", async function () {
        await startST();
        await startST("localhost", 8082);
        ST.init({ hosts: "http://localhost:8080;http://localhost:8081/;http://localhost:8082" });
        let q = Querier.getInstance();
        assert.equal(await q.sendGetRequest("/hello", {}), "Hello\n");
        assert.equal(await q.sendPostRequest("/hello", {}), "Hello\n");
        let hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 2);
        assert.equal(await q.sendPutRequest("/hello", {}), "Hello\n"); // this will be the 4th API call
        hostsAlive = q.getHostsAliveForTesting();
        assert.equal(hostsAlive.size, 2);
        assert.equal(hostsAlive.has("http://localhost:8080"), true);
        assert.equal(hostsAlive.has("http://localhost:8081"), false);
        assert.equal(hostsAlive.has("http://localhost:8082"), true);
    });
});
