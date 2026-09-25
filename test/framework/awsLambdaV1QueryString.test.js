/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, createCoreApplication, mockLambdaProxyEvent, createUsers } = require("../utils");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let { middleware } = require("../../framework/awsLambda");
let EmailPassword = require("../../recipe/emailpassword");
let Dashboard = require("../../recipe/dashboard");

describe(`AWS Lambda REST API (v1) query string: ${printPath(
    "[test/framework/awsLambdaV1QueryString.test.js]"
)}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    it("test that search results correct output for 'email: t' with a REST API (v1) event", async function () {
        const connectionURI = await createCoreApplication();
        SuperTokens.init({
            framework: "awsLambda",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Dashboard.init({
                    apiKey: "testapikey",
                    override: {
                        functions: (original) => {
                            return {
                                ...original,
                                shouldAllowAccess: async function (input) {
                                    let authHeader = input.req.getHeaderValue("authorization");
                                    return authHeader === "Bearer testapikey";
                                },
                            };
                        },
                    },
                }),
                EmailPassword.init(),
            ],
        });

        let proxy = "/dev";

        await createUsers(EmailPassword);

        let event = {
            ...mockLambdaProxyEvent(
                "/auth/dashboard/api/users",
                "GET",
                {
                    Authorization: "Bearer testapikey",
                    "Content-Type": "application/json",
                },
                null,
                proxy
            ),
            queryStringParameters: {
                limit: "10",
                email: "t",
            },
        };

        let result = await middleware()(event, undefined);
        assert.strictEqual(result.statusCode, 200);
        const body = JSON.parse(result.body);
        assert.strictEqual(body.users.length, 5);
    });

    it("test that getOriginalURL keeps the query string for a REST API (v1) event", async function () {
        const { AWSRequest } = require("../../lib/build/framework/awsLambda/framework");
        let event = {
            ...mockLambdaProxyEvent("/auth/oauth/auth", "GET", null, null, "/dev"),
            queryStringParameters: {
                client_id: "abc",
                redirect_uri: "https://example.com/cb?x=1",
            },
        };

        const request = new AWSRequest(event);
        const url = new URL("https://example.com" + request.getOriginalURL());
        assert.strictEqual(url.pathname, "/auth/oauth/auth");
        assert.strictEqual(url.searchParams.get("client_id"), "abc");
        assert.strictEqual(url.searchParams.get("redirect_uri"), "https://example.com/cb?x=1");
    });
});
