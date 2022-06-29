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
let KoaFramework = require("../../framework/koa");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let Koa = require("koa");
const Router = require("@koa/router");
let { verifySession } = require("../../recipe/session/framework/koa");
const request = require("supertest");

describe(`Koa: ${printPath("[test/framework/koa.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        this.server = undefined;
    });

    afterEach(function () {
        if (this.server !== undefined) {
            this.server.close();
        }
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check if disabling api, the default refresh API does not work - you get a 404
    it("test that if disabling api, the default refresh API does not work", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
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

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res2 = await new Promise((resolve) =>
            request(this.server)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(res2.statusCode === 404);
    });

    it("test that if disabling api, the default sign out API does not work", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
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

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        await new Promise((resolve) =>
            request(this.server)
                .post("/create")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        let res2 = await new Promise((resolve) =>
            request(this.server)
                .post("/auth/signout")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(res2.statusCode === 404);
    });

    //- check for token theft detection
    it("express token theft detection", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
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
                                refreshPOST: undefined,
                            };
                        },
                    },
                }),
            ],
        });

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());
        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        router.post("/session/verify", async (ctx, next) => {
            await Session.getSession(ctx, ctx, true);
            ctx.body = "";
        });

        router.post("/auth/session/refresh", async (ctx, next) => {
            try {
                await Session.refreshSession(ctx, ctx);
                ctx.body = { success: false };
            } catch (err) {
                ctx.body = {
                    success: err.type === Session.Error.TOKEN_THEFT_DETECTED,
                };
            }
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise((resolve) =>
            request(this.server)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(res3.body.success, true);

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
    it("express token theft detection with auto refresh middleware", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, _) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        router.post("/session/verify", verifySession(), async (ctx, _) => {
            ctx.body = "";
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise((resolve) =>
            request(this.server)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res3.status === 401);
        assert.strictEqual(res3.text, '{"message":"token theft detected"}');

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
    it("test basic usage of express sessions", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        router.post("/session/verify", async (ctx, next) => {
            await Session.getSession(ctx, ctx, true);
            ctx.body = "";
        });
        router.post("/auth/session/refresh", async (ctx, next) => {
            await Session.refreshSession(ctx, ctx);
            ctx.body = "";
        });
        router.post("/session/revoke", async (ctx, next) => {
            let session = await Session.getSession(ctx, ctx, true);
            await session.revokeSession();
            ctx.body = "";
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
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
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/auth/signout")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

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
    it("test basic usage of express sessions with auto refresh", async function () {
        await startST();

        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
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

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });

        router.post("/session/verify", verifySession(), async (ctx, next) => {
            ctx.body = "";
        });

        router.post("/session/revoke", verifySession(), async (ctx, next) => {
            let session = ctx.session;
            await session.revokeSession();
            ctx.body = "";
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    //check session verify for with / without anti-csrf present
    it("test express session verify with anti-csrf present", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());
        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "id1", {}, {});
            ctx.body = "";
        });

        router.post("/session/verify", async (ctx, next) => {
            let sessionResponse = await Session.getSession(ctx, ctx, { antiCsrfCheck: true });
            ctx.body = { userId: sessionResponse.userId };
        });

        router.post("/session/verifyAntiCsrfFalse", async (ctx, next) => {
            let sessionResponse = await Session.getSession(ctx, ctx, { antiCsrfCheck: false });
            ctx.body = { userId: sessionResponse.userId };
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res2 = await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(res2.body.userId, "id1");

        let res3 = await new Promise((resolve) =>
            request(this.server)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(res3.body.userId, "id1");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify without anti-csrf present express", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());

        router.post("/create", async (ctx, next) => {
            await Session.createNewSession(ctx, "id1", {}, {});
            ctx.body = "";
        });

        router.post("/session/verify", async (ctx, next) => {
            try {
                await Session.getSession(ctx, ctx, { antiCsrfCheck: true });
                ctx.body = { success: false };
            } catch (err) {
                ctx.body = {
                    success: err.type === Session.Error.TRY_REFRESH_TOKEN,
                };
            }
        });

        router.post("/session/verifyAntiCsrfFalse", async (ctx, next) => {
            let sessionResponse = await Session.getSession(ctx, ctx, { antiCsrfCheck: false });
            ctx.body = { userId: sessionResponse.userId };
        });
        app.use(router.routes());
        this.server = app.listen(9999);

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let response2 = await new Promise((resolve) =>
            request(this.server)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response2.body.userId, "id1");

        let response = await new Promise((resolve) =>
            request(this.server)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.body.success, true);
    });

    //check revoking session(s)**
    it("test revoking express sessions", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());
        router.post("/create", async (ctx, _) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });
        router.post("/usercreate", async (ctx, _) => {
            await Session.createNewSession(ctx, "someUniqueUserId", {}, {});
            ctx.body = "";
        });
        router.post("/session/revoke", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            await session.revokeSession();
            ctx.body = "";
        });

        router.post("/session/revokeUserid", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            await Session.revokeAllSessionsForUser(session.getUserId());
            ctx.body = "";
        });

        //create an api call get sesssions from a userid "id1" that returns all the sessions for that userid
        router.post("/session/getSessionsWithUserId1", async (ctx, _) => {
            let sessionHandles = await Session.getAllSessionHandlesForUser("someUniqueUserId");
            ctx.body = sessionHandles;
        });
        app.use(router.routes());
        this.server = app.listen(9999);

        let response = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );
        let sessionRevokedResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");

        await new Promise((resolve) =>
            request(this.server)
                .post("/usercreate")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let userCreateResponse = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/usercreate")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        await new Promise((resolve) =>
            request(this.server)
                .post("/session/revokeUserid")
                .set("Cookie", [
                    "sAccessToken=" +
                        userCreateResponse.accessToken +
                        ";sIdRefreshToken=" +
                        userCreateResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", userCreateResponse.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let sessionHandleResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/session/getSessionsWithUserId1")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(sessionHandleResponse.body.length === 0);
    });

    //check manipulating session data
    it("test manipulating session data with express", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());
        router.post("/create", async (ctx, _) => {
            await Session.createNewSession(ctx, "", {}, {});
            ctx.body = "";
        });
        router.post("/updateSessionData", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            await session.updateSessionData({ key: "value" });
            ctx.body = "";
        });
        router.post("/getSessionData", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            let sessionData = await session.getSessionData();
            ctx.body = sessionData;
        });

        router.post("/updateSessionData2", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            await session.updateSessionData(null);
            ctx.body = "";
        });

        router.post("/updateSessionDataInvalidSessionHandle", async (ctx, _) => {
            ctx.body = { success: !(await Session.updateSessionData("InvalidHandle", { key: "value3" })) };
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        //create a new session
        let response = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        //call the updateSessionData api to add session data
        await new Promise((resolve) =>
            request(this.server)
                .post("/updateSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        //call the getSessionData api to get session data
        let response2 = await new Promise((resolve) =>
            request(this.server)
                .post("/getSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        //check that the session data returned is valid
        assert.strictEqual(response2.body.key, "value");

        // change the value of the inserted session data
        await new Promise((resolve) =>
            request(this.server)
                .post("/updateSessionData2")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        //retrieve the changed session data
        response2 = await new Promise((resolve) =>
            request(this.server)
                .post("/getSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        //check the value of the retrieved
        assert.deepStrictEqual(response2.body, {});

        //invalid session handle when updating the session data
        let invalidSessionResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/updateSessionDataInvalidSessionHandle")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(invalidSessionResponse.body.success, true);
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload with express", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "http://api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "http://supertokens.io",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        let app = new Koa();
        const router = new Router();
        app.use(KoaFramework.middleware());
        router.post("/create", async (ctx, _) => {
            await Session.createNewSession(ctx, "user1", {}, {});
            ctx.body = "";
        });
        router.post("/updateAccessTokenPayload", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            let accessTokenBefore = session.accessToken;
            await session.updateAccessTokenPayload({ key: "value" });
            let accessTokenAfter = session.accessToken;
            let statusCode = accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === "string" ? 200 : 500;
            ctx.status = statusCode;
            ctx.body = "";
        });
        router.post("/getAccessTokenPayload", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            let jwtPayload = session.getAccessTokenPayload();
            ctx.body = jwtPayload;
        });

        router.post("/updateAccessTokenPayload2", async (ctx, _) => {
            let session = await Session.getSession(ctx, ctx, true);
            await session.updateAccessTokenPayload(null);
            ctx.body = "";
        });

        router.post("/updateAccessTokenPayloadInvalidSessionHandle", async (ctx, _) => {
            ctx.body = {
                success: !(await Session.updateAccessTokenPayload("InvalidHandle", { key: "value3" })),
            };
        });

        app.use(router.routes());
        this.server = app.listen(9999);

        //create a new session
        let response = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let frontendInfo = JSON.parse(new Buffer.from(response.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, {});

        //call the updateAccessTokenPayload api to add jwt payload
        let updatedResponse = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/updateAccessTokenPayload")
                    .set("Cookie", [
                        "sAccessToken=" +
                            response.accessToken +
                            ";sIdRefreshToken=" +
                            response.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", response.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, { key: "value" });

        //call the getAccessTokenPayload api to get jwt payload
        let response2 = await new Promise((resolve) =>
            request(this.server)
                .post("/getAccessTokenPayload")
                .set("Cookie", [
                    "sAccessToken=" +
                        updatedResponse.accessToken +
                        ";sIdRefreshToken=" +
                        response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        //check that the jwt payload returned is valid
        assert.strictEqual(response2.body.key, "value");

        // refresh session
        response2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" +
                            response.refreshToken +
                            ";sIdRefreshToken=" +
                            response.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", response.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        frontendInfo = JSON.parse(new Buffer.from(response2.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, { key: "value" });

        // change the value of the inserted jwt payload
        let updatedResponse2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(this.server)
                    .post("/updateAccessTokenPayload2")
                    .set("Cookie", [
                        "sAccessToken=" +
                            response2.accessToken +
                            ";sIdRefreshToken=" +
                            response2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", response2.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        frontendInfo = JSON.parse(new Buffer.from(updatedResponse2.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.deepStrictEqual(frontendInfo.up, {});

        //retrieve the changed jwt payload
        response2 = await new Promise((resolve) =>
            request(this.server)
                .post("/getAccessTokenPayload")
                .set("Cookie", [
                    "sAccessToken=" +
                        updatedResponse2.accessToken +
                        ";sIdRefreshToken=" +
                        response2.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        //check the value of the retrieved
        assert.deepStrictEqual(response2.body, {});
        //invalid session handle when updating the jwt payload
        let invalidSessionResponse = await new Promise((resolve) =>
            request(this.server)
                .post("/updateAccessTokenPayloadInvalidSessionHandle")
                .set("Cookie", [
                    "sAccessToken=" +
                        updatedResponse2.accessToken +
                        ";sIdRefreshToken=" +
                        response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(invalidSessionResponse.body.success, true);
    });

    it("sending custom response koa", async function () {
        await startST();
        SuperTokens.init({
            framework: "koa",
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

        const app = new Koa();
        app.use(KoaFramework.middleware());
        this.server = app.listen(9999);

        let response = await new Promise((resolve) =>
            request(this.server)
                .get("/auth/signup/email/exists?email=test@example.com")
                .expect(203)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.body.custom);
    });
});
