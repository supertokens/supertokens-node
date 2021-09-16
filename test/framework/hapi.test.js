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
let { verifySession } = require("../../recipe/session/framework/hapi");

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
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                await Session.createNewSession(res, "", {}, {});
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
                Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        assert(res2.statusCode === 404);
    });

    it("test that if disabling api, the default sign out API does not work", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                await Session.createNewSession(res, "", {}, {});
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

        assert(res2.statusCode === 404);
    });

    //- check for token theft detection
    it("token theft detection", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                await Session.createNewSession(res, "", {}, {});
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
                try {
                    await Session.refreshSession(req, res);
                    return res.response({ success: false }).code(200);
                } catch (err) {
                    return res
                        .response({
                            success: err.type === Session.Error.TOKEN_THEFT_DETECTED,
                        })
                        .code(200);
                }
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
                    Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res2.accessToken}; sIdRefreshToken=${res2.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
        });

        let res3 = await this.server.inject({
            method: "post",
            url: "/auth/session/refresh",
            headers: {
                Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res3.result.success, true);

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.strictEqual(cookies.idRefreshTokenFromCookie, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
        assert(cookies.idRefreshTokenDomain === undefined);
    });

    //- check for token theft detection
    it("token theft detection with auto refresh middleware", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
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
                    Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res2.accessToken}; sIdRefreshToken=${res2.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
        });

        let res3 = await this.server.inject({
            method: "post",
            url: "/auth/session/refresh",
            headers: {
                Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert(res3.statusCode === 401);
        assert.deepStrictEqual(res3.result, { message: "token theft detected" });

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.strictEqual(cookies.idRefreshTokenFromCookie, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    //check basic usage of session
    it("test basic usage of sessions", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
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
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
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
                    Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/session/verify",
                headers: {
                    Cookie: `sAccessToken=${res2.accessToken}; sIdRefreshToken=${res2.idRefreshTokenFromCookie}`,
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
                Cookie: `sAccessToken=${res3.accessToken}; sIdRefreshToken=${res3.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await this.server.inject({
            method: "post",
            url: "/session/revoke",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}; sIdRefreshToken=${res3.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    it("test signout API works", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
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
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    //check basic usage of session
    it("test basic usage of sessions with auto refresh", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
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
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
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
                    Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                    "anti-csrf": res.antiCsrf,
                },
            })
        );
        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/session/verify",
                headers: {
                    Cookie: `sAccessToken=${res2.accessToken}; sIdRefreshToken=${res2.idRefreshTokenFromCookie}`,
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
                Cookie: `sAccessToken=${res3.accessToken}; sIdRefreshToken=${res3.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await this.server.inject({
            method: "post",
            url: "/session/revoke",
            headers: {
                Cookie: `sAccessToken=${res3.accessToken}; sIdRefreshToken=${res3.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
        });
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify with anti-csrf present", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "id1", {}, {});
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
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res2.result.userId, "id1");

        let res3 = await this.server.inject({
            method: "post",
            url: "/session/verifyAntiCsrfFalse",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res3.result.userId, "id1");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify without anti-csrf present", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        await this.server.register(HapiFramework.plugin);

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "id1", {}, {});
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
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
            },
        });
        assert.strictEqual(response2.result.userId, "id1");

        let response = await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
            },
        });
        assert.strictEqual(response.result.success, true);
    });

    //check revoking session(s)**
    it("test revoking sessions", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
                return res.response("").code(200);
            },
        });
        this.server.route({
            path: "/usercreate",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "someUniqueUserId", {}, {});
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
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");

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
                Cookie: `sAccessToken=${userCreateResponse.accessToken}; sIdRefreshToken=${userCreateResponse.idRefreshTokenFromCookie}`,
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
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            path: "/updateSessionData",
            method: "post",
            handler: async (req, res) => {
                await req.session.updateSessionData({ key: "value" });
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
                let sessionData = await req.session.getSessionData();
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
                await req.session.updateSessionData(null);
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
                try {
                    await Session.updateSessionData("InvalidHandle", { key: "value3" });
                    return res.response({ success: false }).code(200);
                } catch (err) {
                    return res
                        .response({
                            success: err.type === Session.Error.UNAUTHORISED,
                        })
                        .code(200);
                }
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
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                "anti-csrf": response.antiCsrf,
            },
        });

        //call the getSessionData api to get session data
        let response2 = await this.server.inject({
            method: "post",
            url: "/getSessionData",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
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
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                "anti-csrf": response.antiCsrf,
            },
        });

        //retrieve the changed session data
        response2 = await this.server.inject({
            method: "post",
            url: "/getSessionData",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
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
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                "anti-csrf": response.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.result.success, true);
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
        await startST();
        SuperTokens.init({
            framework: "hapi",
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
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        this.server.route({
            path: "/create",
            method: "post",
            handler: async (req, res) => {
                await Session.createNewSession(res, "user1", {}, {});
                return res.response("").code(200);
            },
        });

        this.server.route({
            path: "/updateJWTPayload",
            method: "post",
            handler: async (req, res) => {
                let accessTokenBefore = req.session.accessToken;
                await req.session.updateJWTPayload({ key: "value" });
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
            path: "/getJWTPayload",
            method: "post",
            handler: async (req, res) => {
                let jwtPayload = await req.session.getJWTPayload();
                return res.response(jwtPayload).code(200);
            },
            options: {
                pre: [{ method: verifySession() }],
            },
        });

        this.server.route({
            path: "/updateJWTPayload2",
            method: "post",
            handler: async (req, res) => {
                await req.session.updateJWTPayload(null);
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
            path: "/updateJWTPayloadInvalidSessionHandle",
            method: "post",
            handler: async (req, res) => {
                try {
                    await Session.updateSessionData("InvalidHandle", { key: "value3" });
                    return res.response({ success: false }).code(200);
                } catch (err) {
                    return res
                        .response({
                            success: err.type === Session.Error.UNAUTHORISED,
                        })
                        .code(200);
                }
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
        assert.deepStrictEqual(frontendInfo.up, {});

        //call the updateJWTPayload api to add jwt payload
        let updatedResponse = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/updateJWTPayload",
                headers: {
                    Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                    "anti-csrf": response.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, { key: "value" });

        //call the getJWTPayload api to get jwt payload
        let response2 = await this.server.inject({
            method: "post",
            url: "/getJWTPayload",
            headers: {
                Cookie: `sAccessToken=${updatedResponse.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
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
                    Cookie: `sRefreshToken=${response.refreshToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                    "anti-csrf": response.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(response2.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, { key: "value" });

        // change the value of the inserted jwt payload
        let updatedResponse2 = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/updateJWTPayload2",
                headers: {
                    Cookie: `sAccessToken=${response2.accessToken}; sIdRefreshToken=${response2.idRefreshTokenFromCookie}`,
                    "anti-csrf": response2.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse2.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, {});

        //retrieve the changed jwt payload
        let response3 = await this.server.inject({
            method: "post",
            url: "/getJWTPayload",
            headers: {
                Cookie: `sAccessToken=${updatedResponse2.accessToken}; sIdRefreshToken=${response2.idRefreshTokenFromCookie}`,
                "anti-csrf": response2.antiCsrf,
            },
        });

        //check the value of the retrieved
        assert.deepStrictEqual(response3.result, {});
        //invalid session handle when updating the jwt payload
        let invalidSessionResponse = await this.server.inject({
            method: "post",
            url: "/updateJWTPayloadInvalidSessionHandle",
            headers: {
                Cookie: `sAccessToken=${updatedResponse2.accessToken}; sIdRefreshToken=${response2.idRefreshTokenFromCookie}`,
                "anti-csrf": response2.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.result.success, true);
    });
});
