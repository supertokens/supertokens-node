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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse } = require("../utils");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let SuperTokens = require("../..");
let { middleware } = require("../../framework/awsLambda");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let { verifySession } = require("../../recipe/session/framework/awsLambda");
const request = require("supertest");
const axios = require("axios").default;
let Dashboard = require("../../recipe/dashboard");
const { createUsers } = require("../utils.js")

describe(`Loopback: ${printPath("[test/framework/loopback.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        this.app = require("./loopback-server/index.js");
    });

    afterEach(async function () {
        if (this.app !== undefined) {
            await this.app.stop();
        }
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    //check basic usage of session
    it("test that tags request respond with correct tags", async function () {
        await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
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
                ],
        });

        await this.app.start();

        let result = await axios({
            url: "/auth/dashboard/api/search/tags",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(result.status === 200);
        assert(result.data.tags.length !== 0);
    })

    it("test that search results correct output for 'email: t'", async function () {
        await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
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

        await this.app.start();

        await createUsers(EmailPassword);

        let result = await axios({
            url: "/auth/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                email: 't'
            }
        });
        assert(result.status === 200);
       assert(result.data.users.length === 5);
    });

    it("test that search results correct output for multiple search items", async function () {
        await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
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

        await this.app.start();

        await createUsers(EmailPassword);

        let result = await axios({
            url: "/auth/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                email: 'iresh;john'
            }
        });

        assert(result.status === 200);
        assert(result.data.users.length === 1);
    });

    it("test that search results correct output for 'email: iresh'", async function () {
        await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
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

        await this.app.start();

        await createUsers(EmailPassword);

        let result = await axios({
            url: "/auth/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                email: 'iresh;'
            }
        });

        assert(result.status === 200);
        assert(result.data.users.length === 0);
    });
});
