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
    it("test basic usage of sessions", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        await this.app.start();

        let result = await axios({
            url: "/create",
            baseURL: "http://localhost:9876",
            method: "post",
        });
        let res = extractInfoFromResponse(result);

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        try {
            await axios({
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
            await axios({
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

        result = await axios({
            url: "/session/verify",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.deepStrictEqual(result.data, { user: "userId" });

        result = await axios({
            url: "/session/verify/optionalCSRF",
            baseURL: "http://localhost:9876",
            method: "post",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
        });
        assert.deepStrictEqual(result.data, { user: "userId" });

        try {
            await axios({
                url: "/auth/session/refresh",
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

        result = await axios({
            url: "/auth/session/refresh",
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

        result = await axios({
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

        result = await axios({
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

        let result = await axios({
            url: "/auth/signup/email/exists?email=test@example.com",
            baseURL: "http://localhost:9876",
            method: "get",
        });
        await new Promise((r) => setTimeout(r, 1000)); // we delay so that the API call finishes and doesn't shut the core before the test finishes.
        assert(result.status === 203);
        assert(result.data.custom);
    });

    it("test that authorization header is read correctly in dashboard recipe", async function () {
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

        let result = await axios({
            url: "/auth/dashboard/api/users/count",
            baseURL: "http://localhost:9876",
            method: "get",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(result.status === 200);
    });
});
