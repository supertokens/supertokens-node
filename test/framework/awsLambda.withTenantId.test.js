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
const {
    printPath,
    setupST,
    startST,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    mockLambdaProxyEvent,
    mockLambdaProxyEventV2,
} = require("../utils");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let { middleware } = require("../../framework/awsLambda");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let { verifySession } = require("../../recipe/session/framework/awsLambda");
let Dashboard = require("../../recipe/dashboard");
let { createUsers } = require("../utils");
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`AWS Lambda: ${printPath("[test/framework/awsLambda.withTenantId.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    //check basic usage of session
    it("test basic usage of sessions for lambda proxy event v1", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "awsLambda",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiGatewayPath: "/dev",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let createSession = async (awsEvent, _) => {
            await Session.createNewSession(
                awsEvent,
                awsEvent,
                "public",
                SuperTokens.convertToRecipeUserId("userId"),
                {},
                {}
            );
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let verifyLambdaSession = async (awsEvent, _) => {
            return {
                body: JSON.stringify({
                    user: awsEvent.session.getUserId(),
                }),
                statusCode: 200,
            };
        };

        let revokeSession = async (awsEvent, _) => {
            await awsEvent.session.revokeSession();
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let proxy = "/dev";
        let createAccountEvent = mockLambdaProxyEvent("/create", "POST", null, null, proxy);
        let result = await middleware(createSession)(createAccountEvent, undefined);

        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };

        let res = extractInfoFromResponse(result);

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        let verifySessionEvent = mockLambdaProxyEvent("/session/verify", "POST", null, null, proxy);
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "try refresh token" });

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession, {
            antiCsrfCheck: false,
        })(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        let refreshSessionEvent = mockLambdaProxyEvent("/auth/public/session/refresh", "POST", null, null, proxy);
        result = await middleware()(refreshSessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        refreshSessionEvent = mockLambdaProxyEvent(
            "/auth/public/session/refresh",
            "POST",
            {
                Cookie: `sRefreshToken=${res.refreshToken}`,
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy
        );
        result = await middleware()(refreshSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };

        let res2 = extractInfoFromResponse(result);

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res2.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });
        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };
        let res3 = extractInfoFromResponse(result);
        assert(res3.accessToken !== undefined);

        let revokeSessionEvent = mockLambdaProxyEvent(
            "/session/revoke",
            "POST",
            {
                Cookie: `sAccessToken=${res3.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy
        );
        result = await verifySession(revokeSession)(revokeSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };

        let sessionRevokedResponseExtracted = extractInfoFromResponse(result);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    //check basic usage of session
    it("test basic usage of sessions for lambda proxy event v2", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "awsLambda",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiGatewayPath: "/dev",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let createSession = async (awsEvent, _) => {
            await Session.createNewSession(
                awsEvent,
                awsEvent,
                "public",
                SuperTokens.convertToRecipeUserId("userId"),
                {},
                {}
            );
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let verifyLambdaSession = async (awsEvent, _) => {
            return {
                body: JSON.stringify({
                    user: awsEvent.session.getUserId(),
                }),
                statusCode: 200,
            };
        };

        let revokeSession = async (awsEvent, _) => {
            await awsEvent.session.revokeSession();
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let proxy = "/dev";
        let createAccountEvent = mockLambdaProxyEventV2("/create", "POST", null, null, proxy, null);
        let result = await middleware(createSession)(createAccountEvent, undefined);

        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };

        let res = extractInfoFromResponse(result);

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        let verifySessionEvent = mockLambdaProxyEventV2("/session/verify", "POST", null, null, proxy);
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        verifySessionEvent = mockLambdaProxyEventV2("/session/verify", "POST", null, null, proxy, [
            `sAccessToken=${res.accessToken}`,
        ]);
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "try refresh token" });

        verifySessionEvent = mockLambdaProxyEventV2(
            "/session/verify",
            "POST",
            {
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy,
            [`sAccessToken=${res.accessToken}`]
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        verifySessionEvent = mockLambdaProxyEventV2("/session/verify", "POST", null, null, proxy, [
            `sAccessToken=${res.accessToken}`,
        ]);
        result = await verifySession(verifyLambdaSession, {
            antiCsrfCheck: false,
        })(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        let refreshSessionEvent = mockLambdaProxyEventV2(
            "/auth/public/session/refresh",
            "POST",
            null,
            null,
            proxy,
            null
        );
        result = await middleware()(refreshSessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        refreshSessionEvent = mockLambdaProxyEventV2(
            "/auth/public/session/refresh",
            "POST",
            {
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy,
            [`sRefreshToken=${res.refreshToken}`]
        );
        result = await middleware()(refreshSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };

        let res2 = extractInfoFromResponse(result);

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);

        verifySessionEvent = mockLambdaProxyEventV2(
            "/session/verify",
            "POST",
            {
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy,
            [`sAccessToken=${res2.accessToken}`]
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });
        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };
        let res3 = extractInfoFromResponse(result);
        assert(res3.accessToken !== undefined);

        let revokeSessionEvent = mockLambdaProxyEventV2(
            "/session/revoke",
            "POST",
            {
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy,
            [`sAccessToken=${res3.accessToken}`]
        );
        result = await verifySession(revokeSession)(revokeSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };

        let sessionRevokedResponseExtracted = extractInfoFromResponse(result);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("sending custom response awslambda", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "awsLambda",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiGatewayPath: "/dev",
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

        let proxy = "/dev";
        let event = mockLambdaProxyEventV2("/auth/public/signup/email/exists", "GET", null, null, proxy, null, {
            email: "test@example.com",
        });
        let result = await middleware()(event, undefined);
        assert(result.statusCode === 203);
        assert(JSON.parse(result.body).custom);
    });

    for (const tokenTransferMethod of ["header", "cookie"]) {
        describe(`Throwing UNATHORISED w/ auth-mode=${tokenTransferMethod}`, () => {
            it("should clear all response cookies during refresh", async () => {
                const connectionURI = await startST();
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
                        Session.init({
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                apis: (oI) => {
                                    return {
                                        ...oI,
                                        refreshPOST: async function (input) {
                                            await oI.refreshPOST(input);
                                            throw new Session.Error({
                                                message: "unauthorised",
                                                type: Session.Error.UNAUTHORISED,
                                                clearTokens: true,
                                            });
                                        },
                                    };
                                },
                            },
                        }),
                    ],
                });

                let createSession = async (awsEvent, _) => {
                    await Session.createNewSession(
                        awsEvent,
                        awsEvent,
                        "public",
                        SuperTokens.convertToRecipeUserId("userId"),
                        {},
                        {}
                    );
                    return {
                        body: JSON.stringify(""),
                        statusCode: 200,
                    };
                };

                let proxy = "/dev";
                let createAccountEvent = mockLambdaProxyEventV2(
                    "/create",
                    "POST",
                    { "st-auth-mode": tokenTransferMethod },
                    null,
                    proxy
                );
                let result = await middleware(createSession)(createAccountEvent, undefined);
                result.headers = {
                    ...result.headers,
                    "set-cookie": result.cookies,
                };

                let res = extractInfoFromResponse(result);

                assert.notStrictEqual(res.accessTokenFromAny, undefined);
                assert.notStrictEqual(res.refreshTokenFromAny, undefined);

                const refreshHeaders =
                    tokenTransferMethod === "header"
                        ? { authorization: `Bearer ${res.refreshTokenFromAny}` }
                        : {
                              cookie: `sRefreshToken=${encodeURIComponent(
                                  res.refreshTokenFromAny
                              )}; sIdRefreshToken=asdf`,
                          };
                if (res.antiCsrf) {
                    refreshHeaders.antiCsrf = res.antiCsrf;
                }

                refreshSessionEvent = mockLambdaProxyEventV2(
                    "/auth/public/session/refresh",
                    "POST",
                    refreshHeaders,
                    null,
                    proxy,
                    null
                );
                result = await middleware()(refreshSessionEvent, undefined);
                result.headers = {
                    ...result.headers,
                    "set-cookie": result.cookies,
                };

                let res2 = extractInfoFromResponse(result);

                assert.strictEqual(res2.status, 401);
                if (tokenTransferMethod === "cookie") {
                    assert.strictEqual(res2.accessToken, "");
                    assert.strictEqual(res2.refreshToken, "");
                    assert.strictEqual(res2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res2.accessTokenDomain, undefined);
                    assert.strictEqual(res2.refreshTokenDomain, undefined);
                } else {
                    assert.strictEqual(res2.accessTokenFromHeader, "");
                    assert.strictEqual(res2.refreshTokenFromHeader, "");
                }
                assert.strictEqual(res2.frontToken, "remove");
                assert.strictEqual(res2.antiCsrf, undefined);
            });

            it("test revoking a session after createNewSession with throwing unauthorised error", async function () {
                const connectionURI = await startST();
                SuperTokens.init({
                    framework: "awsLambda",
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "http://api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "http://supertokens.io",
                        apiBasePath: "/",
                    },
                    recipeList: [
                        Session.init({
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                let createSession = async (awsEvent, _) => {
                    await Session.createNewSession(
                        awsEvent,
                        awsEvent,
                        "public",
                        SuperTokens.convertToRecipeUserId("userId"),
                        {},
                        {}
                    );
                    throw new Session.Error({
                        message: "unauthorised",
                        type: Session.Error.UNAUTHORISED,
                        clearTokens: true,
                    });
                };

                let proxy = "/dev";
                let createAccountEvent = mockLambdaProxyEventV2(
                    "/create",
                    "POST",
                    { "st-auth-mode": tokenTransferMethod },
                    null,
                    proxy
                );
                let result = await middleware(createSession)(createAccountEvent, undefined);
                result.headers = {
                    ...result.headers,
                    "set-cookie": result.cookies,
                };

                let res = extractInfoFromResponse(result);

                assert.strictEqual(res.status, 401);
                if (tokenTransferMethod === "cookie") {
                    assert.strictEqual(res.accessToken, "");
                    assert.strictEqual(res.refreshToken, "");
                    assert.strictEqual(res.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res.accessTokenDomain, undefined);
                    assert.strictEqual(res.refreshTokenDomain, undefined);
                } else {
                    assert.strictEqual(res.accessTokenFromHeader, "");
                    assert.strictEqual(res.refreshTokenFromHeader, "");
                }
                assert.strictEqual(res.frontToken, "remove");
                assert.strictEqual(res.antiCsrf, undefined);
            });
        });
    }

    it("test that authorization header is read correctly in dashboard recipe", async function () {
        const connectionURI = await startST();
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

        let proxy = "/dev";

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users/count",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            null
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
    });

    it("test that tags request respond with correct tags", async function () {
        const connectionURI = await startST();
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        let proxy = "/dev";

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/search/tags",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            null
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.tags.length !== 0);
    });

    it("test that search results correct output for 'email: t", async function () {
        const connectionURI = await startST();
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        let proxy = "/dev";

        await createUsers(EmailPassword);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                email: "t",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 5);
    });

    it("test that search results correct output for multiple search items", async function () {
        const connectionURI = await startST();
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }

        let proxy = "/dev";

        await createUsers(EmailPassword);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                email: "john;iresh",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 1);
    });

    it("test that search results correct output for 'email: iresh", async function () {
        const connectionURI = await startST();
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

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.19") === "2.19") {
            return this.skip();
        }
        let proxy = "/dev";

        await createUsers(EmailPassword);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                email: "iresh",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 0);
    });

    it("test that search results correct output for 'phone: +1", async function () {
        const connectionURI = await startST();
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
        let proxy = "/dev";

        await createUsers(null, Passwordless);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                phone: "+1",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 3);
    });

    it("test that search results correct output for 'phone: 1(", async function () {
        const connectionURI = await startST();
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
        let proxy = "/dev";

        await createUsers(null, Passwordless);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                phone: "1(",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 0);
    });

    it("test that search results correct output for 'provider: google'", async function () {
        const connectionURI = await startST();
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
        let proxy = "/dev";

        await createUsers(null, null, ThirdParty);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                provider: "google",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 3);
    });

    it("test that search results correct output for 'provider: google, phone: 1'", async function () {
        const connectionURI = await startST();
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
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
        let proxy = "/dev";

        await createUsers(null, null, ThirdParty);

        let event = mockLambdaProxyEventV2(
            "/auth/public/dashboard/api/users",
            "GET",
            {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
            null,
            proxy,
            null,
            {
                limit: "10",
                provider: "google",
                phone: "1",
            }
        );

        let result = await middleware()(event, undefined);
        assert(result.statusCode === 200);
        const body = JSON.parse(result.body);
        assert(body.users.length === 0);
    });
});
