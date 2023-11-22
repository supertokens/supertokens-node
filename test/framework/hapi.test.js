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
let SuperTokens = require("../../");
let HapiFramework = require("../../framework/hapi");
const Hapi = require("@hapi/hapi");
let Session = require("../../recipe/session");
let ThirdpartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let { verifySession } = require("../../recipe/session/framework/hapi");
let Dashboard = require("../../recipe/dashboard");
let EmailPassword = require("../../recipe/emailpassword");
const { createUsers } = require("../utils.js");
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const Passwordless = require("../../recipe/passwordless");
const ThirdParty = require("../../recipe/thirdparty");
const { HapiRequest } = require("../../lib/build/framework/hapi/framework");
const sinon = require("sinon");

describe(`Hapi: ${printPath("[test/framework/hapi.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        this.server = Hapi.server({
            port: 3000,
            host: "localhost",
        });
    });

    afterEach(async function () {
        try {
            await this.sever.stop();
        } catch (err) {}
    });
    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check if disabling api, the default refresh API does not work - you get a 404
    it("test that if disabling api, the default refresh API does not work", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                refreshPOST: undefined,
                            };
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            method: "post",
            path: "/create",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let res2 = await this.server.inject({
            method: "post",
            url: "/auth/session/refresh",
            headers: {
                Cookie: `sRefreshToken=${res.refreshToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        assert(res2.statusCode === 204);
    });

    it("test that if disabling api, the default sign out API does not work", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signOutPOST: undefined,
                            };
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await this.server.inject({
            method: "post",
            url: "/create",
        });

        let res2 = await this.server.inject({
            method: "post",
            url: "/auth/signout",
        });

        assert(res2.statusCode === 204);
    });

    //- check for token theft detection
    it("token theft detection", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    errorHandlers: {
                        onTokenTheftDetected: async (sessionHandle, userId, recipeUserId, request, response) => {
                            response.sendJSONResponse({
                                success: true,
                            });
                        },
                    },
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                refreshPOST: undefined,
                            };
                        },
                    },
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verify",
            handler: async (req, res) => {
                await Session.getSession(req, res, true);
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/auth/session/refresh",
            handler: async (req, res) => {
                await Session.refreshSession(req, res);
                return res.response({ success: false }).code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let res2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/auth/session/refresh",
                headers: {
                    Cookie: `sRefreshToken=${res.refreshToken}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res2.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });

        let res3 = await this.server.inject({
            method: "post",
            url: "/auth/session/refresh",
            headers: {
                Cookie: `sRefreshToken=${res.refreshToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res3.result.success, true);

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
    });

    //- check for token theft detection
    it("token theft detection with auto refresh middleware", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verify",
            handler: async (req, res) => {
                await Session.getSession(req, res, true);
                return res.response("").code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let res2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/auth/session/refresh",
                headers: {
                    Cookie: `sRefreshToken=${res.refreshToken}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res2.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });

        let res3 = await this.server.inject({
            method: "post",
            url: "/auth/session/refresh",
            headers: {
                Cookie: `sRefreshToken=${res.refreshToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        assert.strictEqual(res3.statusCode, 401);
        assert.deepStrictEqual(res3.result, { message: "token theft detected" });

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    //check basic usage of session
    it("test basic usage of sessions", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verify",
            handler: async (req, res) => {
                await Session.getSession(req, res, true);
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/revoke",
            handler: async (req, res) => {
                let session = await Session.getSession(req, res, true);
                await session.revokeSession();
                return res.response("").code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/auth/session/refresh",
                headers: {
                    Cookie: `sRefreshToken=${res.refreshToken}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/session/verify",
                headers: {
                    Cookie: `sAccessToken=${res2.accessToken}`,
                    "anti-csrf": res2.antiCsrf,
                },
            })
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await this.server.inject({
            method: "post",
            url: "/session/revoke",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("test signout API works", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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
        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let sessionRevokedResponse = await this.server.inject({
            method: "post",
            url: "/auth/signout",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    //check basic usage of session
    it("test basic usage of sessions with auto refresh", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verify",
            handler: async (req, res) => {
                await Session.getSession(req, res, true);
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/revoke",
            handler: async (req, res) => {
                let session = await Session.getSession(req, res, true);
                await session.revokeSession();
                return res.response("").code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/session/refresh",
                headers: {
                    Cookie: `sRefreshToken=${res.refreshToken}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );
        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/session/verify",
                headers: {
                    Cookie: `sAccessToken=${res2.accessToken}`,
                    "anti-csrf": res2.antiCsrf,
                },
            })
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await this.server.inject({
            method: "post",
            url: "/session/revoke",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify with anti-csrf present", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verify",
            handler: async (req, res) => {
                let sessionResponse = await Session.getSession(req, res, true);
                return res.response({ userId: sessionResponse.userId }).code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verifyAntiCsrfFalse",
            handler: async (req, res) => {
                let sessionResponse = await Session.getSession(req, res, false);
                return res.response({ userId: sessionResponse.userId }).code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let res2 = await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res2.result.userId, "id1");

        let res3 = await this.server.inject({
            method: "post",
            url: "/session/verifyAntiCsrfFalse",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res3.result.userId, "id1");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify without anti-csrf present", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verify",
            handler: async (req, res) => {
                try {
                    await Session.getSession(req, res, { antiCsrfCheck: true });
                    return res.response({ success: false }).code(200);
                } catch (err) {
                    return res
                        .response({
                            success: err.type === Session.Error.TRY_REFRESH_TOKEN,
                        })
                        .code(200);
                }
            },
        });

        this.server.route({
            method: "post",
            path: "/session/verifyAntiCsrfFalse",
            handler: async (req, res) => {
                let sessionResponse = await Session.getSession(req, res, { antiCsrfCheck: false });
                return res.response({ userId: sessionResponse.userId }).code(200);
            },
        });

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let response2 = await this.server.inject({
            method: "post",
            url: "/session/verifyAntiCsrfFalse",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
        });
        assert.strictEqual(response2.result.userId, "id1");

        let response = await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
        });
        assert.strictEqual(response.result.success, true);
    });

    //check revoking session(s)**
    it("test revoking sessions", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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
        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });
        this.server.route({
            path: "/usercreate",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(
                    req,
                    res,
                    "public",
                    SuperTokens.convertToRecipeUserId("someUniqueUserId"),
                    {},
                    {}
                );
                return res.response("").code(200);
            },
        });
        this.server.route({
            method: "post",
            path: "/session/revoke",
            handler: async (req, res) => {
                let session = await Session.getSession(req, res, true);
                await session.revokeSession();
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/revokeUserid",
            handler: async (req, res) => {
                let session = await Session.getSession(req, res, true);
                await Session.revokeAllSessionsForUser(session.getUserId());
                return res.response("").code(200);
            },
        });

        this.server.route({
            method: "post",
            path: "/session/getSessionsWithUserId1",
            handler: async (req, res) => {
                let sessionHandles = await Session.getAllSessionHandlesForUser("someUniqueUserId");
                return res.response(sessionHandles).code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );
        let sessionRevokedResponse = await this.server.inject({
            method: "post",
            url: "/session/revoke",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");

        await this.server.inject({
            method: "post",
            url: "/usercreate",
        });
        let userCreateResponse = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/usercreate",
            })
        );

        await this.server.inject({
            method: "post",
            url: "/session/revokeUserid",
            headers: {
                Cookie: `sAccessToken=${userCreateResponse.accessToken}`,
                "anti-csrf": userCreateResponse.antiCsrf,
            },
        });
        let sessionHandleResponse = await this.server.inject({
            method: "post",
            url: "/session/getSessionsWithUserId1",
        });
        assert(sessionHandleResponse.result.length === 0);
    });

    //check manipulating session data
    it("test manipulating session data", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            path: "/updateSessionData",
            method: "post",
            handler: async (req, res) => {
                await req.session.updateSessionDataInDatabase({ key: "value" });
                return res.response("").code(200);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/getSessionData",
            method: "post",
            handler: async (req, res) => {
                let sessionData = await req.session.getSessionDataFromDatabase();
                return res.response(sessionData).code(200);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/updateSessionData2",
            method: "post",
            handler: async (req, res) => {
                await req.session.updateSessionDataInDatabase(null);
                return res.response("").code(200);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/updateSessionDataInvalidSessionHandle",
            method: "post",
            handler: async (req, res) => {
                return res
                    .response({
                        success: !(await Session.updateSessionDataInDatabase("InvalidHandle", { key: "value3" })),
                    })
                    .code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        //create a new session
        let response = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        await this.server.inject({
            method: "post",
            url: "/updateSessionData",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });

        //call the getSessionData api to get session data
        let response2 = await this.server.inject({
            method: "post",
            url: "/getSessionData",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });

        //check that the session data returned is valid
        assert.strictEqual(response2.result.key, "value");

        // change the value of the inserted session data
        await this.server.inject({
            method: "post",
            url: "/updateSessionData2",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });

        //retrieve the changed session data
        response2 = await this.server.inject({
            method: "post",
            url: "/getSessionData",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });

        //check the value of the retrieved
        assert.deepStrictEqual(response2.result, {});

        //invalid session handle when updating the session data
        let invalidSessionResponse = await this.server.inject({
            method: "post",
            url: "/updateSessionDataInvalidSessionHandle",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.result.success, true);
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("user1"), {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            path: "/updateAccessTokenPayload",
            method: "post",
            handler: async (req, res) => {
                let accessTokenBefore = req.session.accessToken;
                await req.session.mergeIntoAccessTokenPayload({ key: "value" });
                let accessTokenAfter = req.session.accessToken;
                let statusCode =
                    accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === "string" ? 200 : 500;
                return res.response("").code(statusCode);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/getAccessTokenPayload",
            method: "post",
            handler: async (req, res) => {
                let jwtPayload = await req.session.getAccessTokenPayload();
                return res.response(jwtPayload).code(200);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/updateAccessTokenPayload2",
            method: "post",
            handler: async (req, res) => {
                await req.session.mergeIntoAccessTokenPayload({ key: null });
                return res.response("").code(200);
            },
            options: {
                pre: [
                    {
                        method: verifySession({
                            antiCsrfCheck: true,
                        }),
                    },
                ],
            },
        });

        this.server.route({
            path: "/updateAccessTokenPayloadInvalidSessionHandle",
            method: "post",
            handler: async (req, res) => {
                return res
                    .response({
                        success: !(await Session.updateSessionDataInDatabase("InvalidHandle", { key: "value3" })),
                    })
                    .code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        //create a new session
        let response = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );

        let frontendInfo = JSON.parse(new Buffer.from(response.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 10);

        //call the updateAccessTokenPayload api to add jwt payload
        let updatedResponse = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/updateAccessTokenPayload",
                headers: {
                    Cookie: `sAccessToken=${response.accessToken}`,
                    "anti-csrf": response.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.key, "value");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 11);

        //call the getAccessTokenPayload api to get jwt payload
        let response2 = await this.server.inject({
            method: "post",
            url: "/getAccessTokenPayload",
            headers: {
                Cookie: `sAccessToken=${updatedResponse.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });
        //check that the jwt payload returned is valid
        assert.strictEqual(response2.result.key, "value");

        // refresh session
        response2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/auth/session/refresh",
                headers: {
                    Cookie: `sRefreshToken=${response.refreshToken}`,
                    "anti-csrf": response.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(response2.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.key, "value");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 11);

        // change the value of the inserted jwt payload
        let updatedResponse2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/updateAccessTokenPayload2",
                headers: {
                    Cookie: `sAccessToken=${response2.accessToken}`,
                    "anti-csrf": response2.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse2.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 10);

        //retrieve the changed jwt payload
        let response3 = await this.server.inject({
            method: "post",
            url: "/getAccessTokenPayload",
            headers: {
                Cookie: `sAccessToken=${updatedResponse2.accessToken}`,
                "anti-csrf": response2.antiCsrf,
            },
        });

        //check the value of the retrieved
        assert.deepStrictEqual(
            new Set(Object.keys(response3.result)),
            new Set([
                "antiCsrfToken",
                "exp",
                "iat",
                "parentRefreshTokenHash1",
                "refreshTokenHash1",
                "sessionHandle",
                "sub",
                "iss",
                "tId",
                "rsub",
            ])
        );

        //invalid session handle when updating the jwt payload
        let invalidSessionResponse = await this.server.inject({
            method: "post",
            url: "/updateAccessTokenPayloadInvalidSessionHandle",
            headers: {
                Cookie: `sAccessToken=${updatedResponse2.accessToken}`,
                "anti-csrf": response2.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.result.success, true);
    });

    it("sending custom response hapi", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdpartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordEmailExistsGET: async function (input) {
                                    input.options.res.setStatusCode(203);
                                    input.options.res.sendJSONResponse({
                                        custom: true,
                                    });
                                    return oI.emailPasswordEmailExistsGET(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let response = await this.server.inject({
            method: "get",
            url: "/auth/signup/email/exists?email=test@example.com",
        });

        assert(response.statusCode === 203);
        assert(response.result.custom);
    });

    it("test that authorization header is read correctly in dashboard recipe", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let res2 = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users/count",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(res2.statusCode === 200);
    });

    it("test verifySession/getSession without accessToken", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        this.server.route({
            path: "/getSessionV1",
            method: "get",
            handler: async (req, res) => {
                return res.response({}).code(200);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/getSessionV2",
            method: "get",
            handler: async (req, res) => {
                await Session.getSession(req, res);
                return res.response({}).code(200);
            },
        });

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        let response1 = await this.server.inject({
            method: "get",
            url: "/getSessionV1",
        });

        assert.strictEqual(response1.statusCode, 401);

        let response2 = await this.server.inject({
            method: "get",
            url: "/getSessionV2",
        });

        assert.strictEqual(response2.statusCode, 401);
    });

    it("test that tags request respond with correct tags", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(EmailPassword);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/search/tags",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.tags.length !== 0);
    });

    it("test that search results correct output for 'email: t'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(EmailPassword);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&email=t",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 5);
    });

    it("test that search results correct output for 'email: iresh'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(EmailPassword);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&email=iresh",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 0);
    });
    it("test that search results correct output for multiple search items", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(EmailPassword);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&email=john;iresh",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 1);
    });

    it("test that search results correct output for 'phone: +1'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(null, Passwordless);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&phone=%2B1",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 3);
    });

    it("test that search results correct output for 'phone: 1('", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(null, Passwordless);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&phone=1%28",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 0);
    });

    it("test that search results correct output for 'provider: google, phone: 1'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(null, Passwordless, ThirdParty);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&provider=google&phone=1",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 0);
    });

    it("test that search results correct output for 'provider: google'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "hapi",
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

        await this.server.register(HapiFramework.plugin);

        await this.server.initialize();

        await createUsers(null, null, ThirdParty);

        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&provider=google",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });
        assert(resp.statusCode === 200);
        assert(resp.result.users.length === 3);
    });
});

describe(`HapiRequest`, function () {
    it("HapiRequest.getJSONFromRequestBody should be called only once", async function () {
        const mockJSONData = { key: "value" };
        const req = new HapiRequest({});

        const getJSONFromRequestBodyStub = sinon.stub(req, "getJSONFromRequestBody").callsFake(() => mockJSONData);

        // Call getJSONBody multiple times
        const getJsonBody = req.getJSONBody;
        const jsonData = await getJsonBody();
        const jsonData2 = await req.getJSONBody();

        sinon.assert.calledOnce(getJSONFromRequestBodyStub);

        assert(JSON.stringify(jsonData) === JSON.stringify(mockJSONData));
        assert(JSON.stringify(jsonData2) === JSON.stringify(mockJSONData));
    });

    it("HapiRequest.getFormDataFromRequestBody should be called only once", async function () {
        const mockFormData = { key: "value" };
        const req = new HapiRequest({});

        let getFormDataFromRequestBodyStub = sinon
            .stub(req, "getFormDataFromRequestBody")
            .callsFake(() => mockFormData);

        // Call getFormData multiple times
        const getFormData = req.getFormData;
        const formData = await getFormData();
        const formData2 = await req.getFormData();

        sinon.assert.calledOnce(getFormDataFromRequestBodyStub);

        assert(JSON.stringify(formData) === JSON.stringify(mockFormData));
        assert(JSON.stringify(formData2) === JSON.stringify(mockFormData));
    });
});
