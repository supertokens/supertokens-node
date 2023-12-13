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
    extractCookieCountInfo,
} = require("../utils");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let FastifyFramework = require("../../framework/fastify");
const Fastify = require("fastify");
let EmailPassword = require("../../recipe/emailpassword");
const EmailVerification = require("../../recipe/emailverification");
let Session = require("../../recipe/session");
let { verifySession } = require("../../recipe/session/framework/fastify");
let Dashboard = require("../../recipe/dashboard");
let { createUsers } = require("../utils");
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const Passwordless = require("../../recipe/passwordless");
const ThirdParty = require("../../recipe/thirdparty");
const { FastifyRequest } = require("../../lib/build/framework/fastify/framework");
const sinon = require("sinon");

describe(`Fastify: ${printPath("[test/framework/fastify.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        this.server = Fastify();
    });

    afterEach(async function () {
        try {
            await this.server.close();
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
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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

        assert(res2.statusCode === 404);
    });

    it("test that if disabling api, the default sign out API does not work", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.setErrorHandler(FastifyFramework.errorHandler());

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            return res.send("").code(200);
        });

        this.server.post("/auth/session/refresh", async (req, res) => {
            await Session.refreshSession(req, res);
            return res.send({ success: false }).code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert.strictEqual(res3.json().success, true);

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
    });

    // - check for token theft detection
    it("token theft detection with auto refresh middleware", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.setErrorHandler(FastifyFramework.errorHandler());

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert(res3.statusCode === 401);
        assert.deepStrictEqual(res3.json(), { message: "token theft detected" });

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    // - check for token theft detection without error handler
    it("token theft detection with auto refresh middleware without error handler", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert(res3.statusCode === 401);
        assert.deepStrictEqual(res3.json(), { message: "token theft detected" });

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    // - check if session verify middleware responds with a nice error even without the global error handler
    it("test session verify middleware without error handler added", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post(
            "/session/verify",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                return res.send("").code(200);
            }
        );

        await this.server.register(FastifyFramework.plugin);

        let res = await this.server.inject({
            method: "post",
            url: "/session/verify",
        });

        assert.strictEqual(res.statusCode, 401);
        assert.deepStrictEqual(res.json(), { message: "unauthorised" });
    });

    // check basic usage of session
    it("test basic usage of sessions", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            return res.send("").code(200);
        });

        this.server.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.revokeSession();
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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

    // check basic usage of session
    it("test basic usage of sessions with auto refresh", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            return res.send("").code(200);
        });

        this.server.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.revokeSession();
            return res.send("").code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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

        assert.notStrictEqual(res2.accessToken, undefined);
        assert.notStrictEqual(res2.antiCsrf, undefined);
        assert.notStrictEqual(res2.refreshToken, undefined);

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
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res);
            return res.send({ userId: sessionResponse.userId }).code(200);
        });

        this.server.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res, false);
            return res.send({ userId: sessionResponse.userId }).code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert.strictEqual(res2.json().userId, "id1");

        let res3 = await this.server.inject({
            method: "post",
            url: "/session/verifyAntiCsrfFalse",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res3.json().userId, "id1");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify without anti-csrf present", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            try {
                await Session.getSession(req, res, { antiCsrfCheck: true });
                return res.send({ success: false }).code(200);
            } catch (err) {
                return res
                    .send({
                        success: err.type === Session.Error.TRY_REFRESH_TOKEN,
                    })
                    .code(200);
            }
        });

        this.server.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res, { antiCsrfCheck: false });
            return res.send({ userId: sessionResponse.userId }).code(200);
        });
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
        assert.strictEqual(response2.json().userId, "id1");

        let response = await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}`,
            },
        });
        assert.strictEqual(response.json().success, true);
    });

    //check revoking session(s)**
    it("test revoking sessions", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });
        this.server.post("/usercreate", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("someUniqueUserId"),
                {},
                {}
            );
            return res.send("").code(200);
        });
        this.server.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.revokeSession();
            return res.send("").code(200);
        });

        this.server.post("/session/revokeUserid", async (req, res) => {
            let session = await Session.getSession(req, res);
            await Session.revokeAllSessionsForUser(session.getUserId());
            return res.send("").code(200);
        });

        this.server.post("/session/getSessionsWithUserId1", async (req, res) => {
            let sessionHandles = await Session.getAllSessionHandlesForUser("someUniqueUserId");
            return res.send(sessionHandles).code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert(sessionHandleResponse.json().length === 0);
    });

    //check manipulating session data
    it("test manipulating session data", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            return res.send("").code(200);
        });

        this.server.post(
            "/updateSessionData",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                await req.session.updateSessionDataInDatabase({ key: "value" });
                return res.send("").code(200);
            }
        );

        this.server.post(
            "/getSessionData",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                let sessionData = await req.session.getSessionDataFromDatabase();
                return res.send(sessionData).code(200);
            }
        );

        this.server.post(
            "/updateSessionData2",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                await req.session.updateSessionDataInDatabase(null);
                return res.send("").code(200);
            }
        );

        this.server.post("/updateSessionDataInvalidSessionHandle", async (req, res) => {
            return res
                .send({ success: !(await Session.updateSessionDataInDatabase("InvalidHandle", { key: "value3" })) })
                .code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert.strictEqual(response2.json().key, "value");

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
        assert.deepStrictEqual(response2.json(), {});

        //invalid session handle when updating the session data
        let invalidSessionResponse = await this.server.inject({
            method: "post",
            url: "/updateSessionDataInvalidSessionHandle",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "anti-csrf": response.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.json().success, true);
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("user1"), {}, {});
            return res.send("").code(200);
        });

        this.server.post(
            "/updateAccessTokenPayload",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                let accessTokenBefore = req.session.accessToken;
                await req.session.mergeIntoAccessTokenPayload({ key: "value" });
                let accessTokenAfter = req.session.accessToken;
                let statusCode =
                    accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === "string" ? 200 : 500;
                return res.send("").code(statusCode);
            }
        );

        this.server.post(
            "/getAccessTokenPayload",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                let jwtPayload = await req.session.getAccessTokenPayload();
                return res.send(jwtPayload).code(200);
            }
        );

        this.server.post(
            "/updateAccessTokenPayload2",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                await req.session.mergeIntoAccessTokenPayload({ key: null });
                return res.send("").code(200);
            }
        );

        this.server.post("/updateAccessTokenPayloadInvalidSessionHandle", async (req, res) => {
            return res
                .send({ success: !(await Session.updateSessionDataInDatabase("InvalidHandle", { key: "value3" })) })
                .code(200);
        });

        await this.server.register(FastifyFramework.plugin);

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
        assert.strictEqual(response2.json().key, "value");

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
            new Set(Object.keys(response3.json())),
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
        assert.strictEqual(invalidSessionResponse.json().success, true);
    });

    it("sending custom response fastify", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);

        //create a new session
        let response = await this.server.inject({
            method: "get",
            url: "/auth/signup/email/exists?email=test@example.com",
        });

        assert(response.statusCode === 203);

        assert(JSON.parse(response.body).custom);
    });

    it("generating email verification token without payload", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({ mode: "OPTIONAL" }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        await this.server.register(FastifyFramework.plugin);

        // sign up a user first
        let response = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/auth/signup",
                payload: {
                    formFields: [
                        {
                            id: "email",
                            value: "johndoe@gmail.com",
                        },
                        {
                            id: "password",
                            value: "testPass123",
                        },
                    ],
                },
            })
        );

        // send generate email verification token request
        let res2 = await this.server.inject({
            method: "post",
            url: "/auth/user/email/verify/token",
            payload: {},
            headers: {
                Cookie: `sAccessToken=${response.accessToken}`,
                "Content-Type": "application/json",
            },
        });

        assert.equal(res2.statusCode, 200);
    });

    it("test same cookie is not getting set multiple times", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            return res.send("").code(200);
        });

        let res = extractCookieCountInfo(
            await this.server.inject({
                method: "post",
                url: "/create",
            })
        );
        assert.strictEqual(res.accessToken, 1);
        assert.strictEqual(res.refreshToken, 1);
    });

    it("test that authorization header is read correctly in dashboard recipe", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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
        await this.server.register(FastifyFramework.plugin);

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

    it("test that tags request respond with correct tags", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);
        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/search/tags",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(resp.statusCode === 200);
        const body = resp.json();
        assert(body.tags.length !== 0);
    });

    it("test that search results correct output for 'email: t'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);
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
        const body = resp.json();
        assert(body.users.length === 5);
    });

    it("test that search results correct output for multiple search terms", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);
        await createUsers(EmailPassword);
        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&email=iresh;john",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(resp.statusCode === 200);
        const body = resp.json();
        assert(body.users.length === 1);
    });

    it("test that search results correct output for 'email: iresh'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);
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
        const body = resp.json();
        assert(body.users.length === 0);
    });

    it("test that search results correct output for 'phone: +1'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await createUsers(null, Passwordless);
        await this.server.register(FastifyFramework.plugin);
        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&phone=%2B1",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(resp.statusCode === 200);
        const body = resp.json();
        assert(body.users.length === 3);
    });

    it("test that search results correct output for 'phone: 1('", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await createUsers(null, null);
        await this.server.register(FastifyFramework.plugin);
        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&phone=1%28",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(resp.statusCode === 200);
        const body = resp.json();
        assert(body.users.length === 0);
    });

    it("test that search results correct output for 'provider: google'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await createUsers(null, null, ThirdParty);
        await this.server.register(FastifyFramework.plugin);
        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&provider=google",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(resp.statusCode === 200);
        const body = resp.json();
        assert(body.users.length === 3);
    });

    it("test that search results correct output for 'provider: google, phone: 1'", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await createUsers(null, Passwordless, ThirdParty);
        await this.server.register(FastifyFramework.plugin);
        let resp = await this.server.inject({
            method: "get",
            url: "/auth/dashboard/api/users?limit=10&provider=google&phone=1",
            headers: {
                Authorization: "Bearer testapikey",
                "Content-Type": "application/json",
            },
        });

        assert(resp.statusCode === 200);
        const body = resp.json();
        assert(body.users.length === 0);
    });
});

describe(`FastifyRequest`, function () {
    it("FastifyRequest.getJSONFromRequestBody should be called only once", async function () {
        const mockJSONData = { key: "value" };
        const req = new FastifyRequest({});

        const getJSONFromRequestBodyStub = sinon.stub(req, "getJSONFromRequestBody").callsFake(() => mockJSONData);

        // Call getJSONBody multiple times
        const getJsonBody = req.getJSONBody;
        const jsonData = await getJsonBody();
        const jsonData2 = await req.getJSONBody();

        sinon.assert.calledOnce(getJSONFromRequestBodyStub);

        assert(JSON.stringify(jsonData) === JSON.stringify(mockJSONData));
        assert(JSON.stringify(jsonData2) === JSON.stringify(mockJSONData));
    });

    it("FastifyRequest.getFormDataFromRequestBody should be called only once", async function () {
        const mockFormData = { key: "value" };
        const req = new FastifyRequest({});

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
