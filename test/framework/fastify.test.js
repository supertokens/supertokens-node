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
let FastifyFramework = require("../../framework/fastify");
const Fastify = require("fastify");
let EmailPassword = require("../../recipe/emailpassword");
let Session = require("../../recipe/session");
let { verifySession } = require("../../recipe/session/framework/fastify");

describe(`Fastify: ${printPath("[test/framework/fastify.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        this.server = Fastify();
    });

    afterEach(async function () {
        try {
            await this.sever.close();
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
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
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
                Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });

        assert(res2.statusCode === 404);
    });

    it("test that if disabling api, the default sign out API does not work", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
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
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
            return res.send("").code(200);
        });

        this.server.post("/auth/session/refresh", async (req, res) => {
            try {
                await Session.refreshSession(req, res);
                return res.send({ success: false }).code(200);
            } catch (err) {
                return res
                    .send({
                        success: err.type === Session.Error.TOKEN_THEFT_DETECTED,
                    })
                    .code(200);
            }
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
        assert.strictEqual(res3.json().success, true);

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

    // - check for token theft detection
    it("token theft detection with auto refresh middleware", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.setErrorHandler(FastifyFramework.errorHandler());

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
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
        assert.deepStrictEqual(res3.json(), { message: "token theft detected" });

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

    // - check for token theft detection without error handler
    it("token theft detection with auto refresh middleware without error handler", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
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
        assert.deepStrictEqual(res3.json(), { message: "token theft detected" });

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

    // - check if session verify middleware responds with a nice error even without the global error handler
    it("test session verify middleware without error handler added", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
            return res.send("").code(200);
        });

        this.server.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res, true);
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
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
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

    // check basic usage of session
    it("test basic usage of sessions with auto refresh", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
            return res.send("").code(200);
        });

        this.server.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res, true);
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
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "id1", {}, {});
            return res.send("").code(200);
        });

        this.server.post("/session/verify", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res, true);
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
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res2.json().userId, "id1");

        let res3 = await this.server.inject({
            method: "post",
            url: "/session/verifyAntiCsrfFalse",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
        });
        assert.strictEqual(res3.json().userId, "id1");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify without anti-csrf present", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        await this.server.register(FastifyFramework.plugin);

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "id1", {}, {});
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
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
            },
        });
        assert.strictEqual(response2.json().userId, "id1");

        let response = await this.server.inject({
            method: "post",
            url: "/session/verify",
            headers: {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
            },
        });
        assert.strictEqual(response.json().success, true);
    });

    //check revoking session(s)**
    it("test revoking sessions", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });
        this.server.post("/usercreate", async (req, res) => {
            await Session.createNewSession(res, "someUniqueUserId", {}, {});
            return res.send("").code(200);
        });
        this.server.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res, true);
            await session.revokeSession();
            return res.send("").code(200);
        });

        this.server.post("/session/revokeUserid", async (req, res) => {
            let session = await Session.getSession(req, res, true);
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
        assert(sessionHandleResponse.json().length === 0);
    });

    //check manipulating session data
    it("test manipulating session data", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return res.send("").code(200);
        });

        this.server.post(
            "/updateSessionData",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                await req.session.updateSessionData({ key: "value" });
                return res.send("").code(200);
            }
        );

        this.server.post(
            "/getSessionData",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                let sessionData = await req.session.getSessionData();
                return res.send(sessionData).code(200);
            }
        );

        this.server.post(
            "/updateSessionData2",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                await req.session.updateSessionData(null);
                return res.send("").code(200);
            }
        );

        this.server.post("/updateSessionDataInvalidSessionHandle", async (req, res) => {
            return res
                .send({ success: !(await Session.updateSessionData("InvalidHandle", { key: "value3" })) })
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
        assert.strictEqual(response2.json().key, "value");

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
        assert.deepStrictEqual(response2.json(), {});

        //invalid session handle when updating the session data
        let invalidSessionResponse = await this.server.inject({
            method: "post",
            url: "/updateSessionDataInvalidSessionHandle",
            headers: {
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                "anti-csrf": response.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.json().success, true);
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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

        this.server.post("/create", async (req, res) => {
            await Session.createNewSession(res, "user1", {}, {});
            return res.send("").code(200);
        });

        this.server.post(
            "/updateAccessTokenPayload",
            {
                preHandler: verifySession(),
            },
            async (req, res) => {
                let accessTokenBefore = req.session.accessToken;
                await req.session.updateAccessTokenPayload({ key: "value" });
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
                await req.session.updateAccessTokenPayload(null);
                return res.send("").code(200);
            }
        );

        this.server.post("/updateAccessTokenPayloadInvalidSessionHandle", async (req, res) => {
            return res
                .send({ success: !(await Session.updateSessionData("InvalidHandle", { key: "value3" })) })
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
        assert.deepStrictEqual(frontendInfo.up, {});

        //call the updateAccessTokenPayload api to add jwt payload
        let updatedResponse = extractInfoFromResponse(
            await this.server.inject({
                method: "post",
                url: "/updateAccessTokenPayload",
                headers: {
                    Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                    "anti-csrf": response.antiCsrf,
                },
            })
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, { key: "value" });

        //call the getAccessTokenPayload api to get jwt payload
        let response2 = await this.server.inject({
            method: "post",
            url: "/getAccessTokenPayload",
            headers: {
                Cookie: `sAccessToken=${updatedResponse.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
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
                url: "/updateAccessTokenPayload2",
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
            url: "/getAccessTokenPayload",
            headers: {
                Cookie: `sAccessToken=${updatedResponse2.accessToken}; sIdRefreshToken=${response2.idRefreshTokenFromCookie}`,
                "anti-csrf": response2.antiCsrf,
            },
        });

        //check the value of the retrieved
        assert.deepStrictEqual(response3.json(), {});
        //invalid session handle when updating the jwt payload
        let invalidSessionResponse = await this.server.inject({
            method: "post",
            url: "/updateAccessTokenPayloadInvalidSessionHandle",
            headers: {
                Cookie: `sAccessToken=${updatedResponse2.accessToken}; sIdRefreshToken=${response2.idRefreshTokenFromCookie}`,
                "anti-csrf": response2.antiCsrf,
            },
        });
        assert.strictEqual(invalidSessionResponse.json().success, true);
    });

    it("sending custom response fastify", async function () {
        await startST();
        SuperTokens.init({
            framework: "fastify",
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
                Session.init(),
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
        await startST();
        SuperTokens.init({
            framework: "fastify",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
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
                Cookie: `sAccessToken=${response.accessToken}; sIdRefreshToken=${response.idRefreshTokenFromCookie}`,
                "Content-Type": "application/json",
            },
        });

        assert(res2.statusCode === 200);
    });
});
