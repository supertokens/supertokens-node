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
const { printPath } = require("./utils");
let assert = require("assert");
const debug = require("debug");
let ST = require("../");
let Session = require("../recipe/session");
const SuperTokens = require("../lib/build/supertokens").default;

describe(`Middleware skip debug log: ${printPath("[test/middlewareSkipLog.test.js]")}`, function () {
    let logs;
    let originalLog;

    beforeEach(function () {
        logs = [];
        originalLog = debug.log;
        debug.log = (...args) => logs.push(args.join(" "));
    });

    afterEach(function () {
        debug.log = originalLog;
    });

    async function skippedRequestLog(apiGatewayPath, url) {
        ST.init({
            debug: true,
            supertokens: { connectionURI: "http://localhost:3567" },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiGatewayPath,
            },
            recipeList: [Session.init()],
        });
        const request = {
            getOriginalURL: () => url,
            getMethod: () => "get",
            getHeaderValue: () => undefined,
            original: {},
        };
        const handled = await SuperTokens.getInstanceOrThrowError().middleware(request, {}, {});
        assert.strictEqual(handled, false);
        return logs.filter((l) => l.includes("did not start with config path")).join("\n");
    }

    it("prints the apiBasePath and the gateway explanation, without the query string", async function () {
        const log = await skippedRequestLog("/gateway", "/other/path?token=SECRET");
        assert(log.includes("Request path: /gateway/other/path"));
        assert(log.includes("Config path (apiBasePath): /gateway/auth"));
        assert(log.includes("prefixed with the configured apiGatewayPath (/gateway)"));
        assert(log.includes("received URL (/other/path)"));
        assert(!log.includes("SECRET"));
    });

    it("only prints the apiBasePath when there is no apiGatewayPath", async function () {
        const log = await skippedRequestLog(undefined, "/other/path");
        assert(log.includes("Request path: /other/path"));
        assert(log.includes("Config path (apiBasePath): /auth"));
        assert(!log.includes("apiGatewayPath"));
    });
});
