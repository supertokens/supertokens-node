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
let Dashboard = require("../../recipe/dashboard");
const { createUsers } = require("../utils.js");
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const Passwordless = require("../../recipe/passwordless");
const ThirdParty = require("../../recipe/thirdparty");
const { default: fetch } = require("cross-fetch");

describe(`Loopback: ${printPath("[test/framework/loopback.withTenantId.test.js]")}`, function () {
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
    it("test basic usage of sessions", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
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

        await this.app.start();

        let result = await request({
            url: "/create",
            baseURL: "http://localhost:9876",
            method: "post",
        });
        let res = extractInfoFromResponse(result);
        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        try {
            await request({
                url: "/session/verify",
                baseURL: "http://localhost:9876",
                method: "post",
            });
        } catch (err) {
            if (err !== undefined && err.response !== undefined) {
                assert.strictEqual(err.response.status, 401);
                assert.deepStrictEqual(err.response.data, { message: "unauthorised" });
            } else {
                throw err;
            }
        }

        try {
            await request({
                url: "/session/verify",
                baseURL: "http://localhost:9876",
                method: "post",
                headers: {
                    Cookie: `sAccessToken=${res.accessToken}`,
                },
            });
        } catch (err) {
            if (err !== undefined && err.response !== undefined) {
                assert.strictEqual(err.response.status, 401);
                assert.deepStrictEqual(err.response.data, { message: "try refresh token" });
            } else {
                throw err;
            }
        }

        result = await request({
            url: "/session/verify",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.deepStrictEqual(result.data, { user: "userId" });

        result = await request({
            url: "/session/verify/optionalCSRF",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
        });
        assert.deepStrictEqual(result.data, { user: "userId" });

        try {
            await request({
                url: "/auth/public/session/refresh",
                baseURL: "http://localhost:9876",
                method: "post",
            });
        } catch (err) {
            if (err !== undefined && err.response !== undefined) {
                assert.strictEqual(err.response.status, 401);
                assert.deepStrictEqual(err.response.data, { message: "unauthorised" });
            } else {
                throw err;
            }
        }

        result = await request({
            url: "/auth/public/session/refresh",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sRefreshToken=${res.refreshToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        let res2 = extractInfoFromResponse(result);

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);

        result = await request({
            url: "/session/verify",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sAccessToken=${res2.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        assert.deepStrictEqual(result.data, { user: "userId" });

        let res3 = extractInfoFromResponse(result);
        assert(res3.accessToken !== undefined);

        result = await request({
            url: "/session/revoke",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });

        let sessionRevokedResponseExtracted = extractInfoFromResponse(result);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("sending custom response", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailExistsGET: async function (input) {
                                    input.options.res.setStatusCode(203);
                                    input.options.res.sendJSONResponse({
                                        custom: true,
                                    });
                                    return oI.emailExistsGET(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        await this.app.start();

        let result = await request({
            url: "/auth/public/signup/email/exists?email=test@example.com",
            baseURL: "http://localhost:9876",
            method: "get",
        });
        await new Promise((r) => setTimeout(r, 1000)); // we delay so that the API call finishes and doesn't shut the core before the test finishes.
        assert(result.status === 203);
        assert(result.data.custom);
    });

    it("test that authorization header is read correctly in dashboard recipe", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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
                                    if (authHeader === "Bearer testapikey") {
                                        return true;
                                    }

                                    return false;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        await this.app.start();

        let result = await request({
            url: "/auth/public/dashboard/api/users/count",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(result.status === 200);
    });

    it("test that tags request respond with correct tags", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        let result = await request({
            url: "/auth/public/dashboard/api/search/tags",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(result.status === 200);
        assert(result.data.tags.length !== 0);
    });

    it("test that search results correct output for 'email: t'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(EmailPassword);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                email: "t",
            },
        });
        assert(result.status === 200);
        assert(result.data.users.length === 5);
    });

    it("test that search results correct output for multiple search items", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(EmailPassword);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                email: "iresh;john",
            },
        });

        assert(result.status === 200);
        assert(result.data.users.length === 1);
    });

    it("test that search results correct output for 'email: iresh'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(EmailPassword);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                email: "iresh;",
            },
        });

        assert(result.status === 200);
        assert(result.data.users.length === 0);
    });

    it("test that search results correct output for 'phone: +1'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
            ],
        });

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(null, Passwordless);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                phone: "+1",
            },
        });

        assert(result.status === 200);
        assert(result.data.users.length === 3);
    });

    it("test that search results correct output for 'phone: 1('", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
            ],
        });

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(null, Passwordless);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                phone: "1(",
            },
        });

        assert(result.status === 200);
        assert(result.data.users.length === 0);
    });

    it("test that search results correct output for 'provider: google', phone: 1", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId:
                                                "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                                            clientSecret: "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",
                                        },
                                    ],
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "github",
                                    clients: [
                                        {
                                            clientId: "467101b197249757c71f",
                                            clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
                                        },
                                    ],
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "apple",
                                    clients: [
                                        {
                                            clientId: "4398792-io.supertokens.example.service",
                                            additionalConfig: {
                                                keyId: "7M48Y4RYDL",
                                                privateKey:
                                                    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                                                teamId: "YWQCXGJRJL",
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                }),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
            ],
        });

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(null, Passwordless, ThirdParty);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                provider: "google",
                phone: "1",
            },
        });

        assert(result.status === 200);
        assert(result.data.users.length === 0);
    });

    it("test that search results correct output for 'provider: google'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "loopback",
            supertokens: {
                connectionURI,
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
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId:
                                                "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                                            clientSecret: "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",
                                        },
                                    ],
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "github",
                                    clients: [
                                        {
                                            clientId: "467101b197249757c71f",
                                            clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
                                        },
                                    ],
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "apple",
                                    clients: [
                                        {
                                            clientId: "4398792-io.supertokens.example.service",
                                            additionalConfig: {
                                                keyId: "7M48Y4RYDL",
                                                privateKey:
                                                    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                                                teamId: "YWQCXGJRJL",
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        await this.app.start();

        await createUsers(null, null, ThirdParty);

        let result = await request({
            url: "/auth/public/dashboard/api/users",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            params: {
                limit: 10,
                provider: "google",
            },
        });

        assert(result.status === 200);
        assert(result.data.users.length === 3);
    });
});

async function request(init) {
    const url = new URL(init.url, init.baseURL);
    if (init.params) {
        url.search = new URLSearchParams(init.params).toString();
    }

    /** @type {Response} */
    const resp = await fetch(url, {
        ...init,
    });
    const headers = Object.fromEntries(resp.headers.entries());
    if (resp.headers.has("set-cookie")) {
        let split = resp.headers.get("set-cookie").split(/, (\w+=)/);
        headers["set-cookie"] = [split[0]];
        for (let i = 1; i + 1 < split.length; i += 2) {
            headers["set-cookie"].push(`${split[i]}${split[i + 1]}`);
        }
    }
    return {
        status: resp.status,
        data: await resp.json(),
        headers,
    };
}
