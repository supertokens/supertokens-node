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
    setKeyValueInConfig,
    extractInfoFromResponse,
    delay,
} = require("./utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let { middleware, errorHandler } = require("../framework/express");
let { verifySession } = require("../recipe/session/framework/express");

/**
 * TODO: (Later) check that disabling default API actually disables it (for emailpassword)
 */

describe(`middleware: ${printPath("[test/middleware.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check that disabling default API actually disables it (for session)
    it("test disabling default API actually disables it", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
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

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 404);
    });

    it("test session verify middleware", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
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
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/user/handleV0", verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/user/handleV1",
            verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/user/handleOptional",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/auth/session/refresh", verifySession(), async (req, res, next) => {
            res.status(200).json({ message: true });
        });

        app.post("/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(errorHandler());

        let res1 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
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
        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/user/id")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r1 === "testing-userId");

        await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        // not passing anti csrf even if requried
        let r2V0 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V0 === "try refresh token");

        let r2V1 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV1")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V1 === "try refresh token");

        let r2Optional = await new Promise((resolve) =>
            request(app)
                .get("/user/handleOptional")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2Optional === true);

        r2Optional = await new Promise((resolve) =>
            request(app)
                .get("/user/handleOptional")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2Optional === false);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/session/refresh")
                    .expect(200)
                    .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                    .set("anti-csrf", res1.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .get("/user/id")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        let r4 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(403)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r4 === "token theft detected");

        let res4 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/logout")
                    .set("Cookie", ["sAccessToken=" + res3.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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

        assert.strictEqual(res4.antiCsrf, undefined);
        assert.strictEqual(res4.accessToken, "");
        assert.strictEqual(res4.refreshToken, "");
        assert.strictEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res4.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert.strictEqual(r5, "unauthorised");
    });

    it("test session verify middleware with auto refresh", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
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
                    antiCsrf: "VIA_TOKEN",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({
                                message: "token theft detected",
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/user/handleV0", verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/user/handleV1",
            verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/user/handleOptional",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(errorHandler());

        let res1 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
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
        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/user/id")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r1 === "testing-userId");

        await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        // not passing anti csrf even if requried
        let r2V0 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V0 === "try refresh token");

        let r2V1 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV1")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V1 === "try refresh token");

        let rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/user/handleOptional")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(rOptionalSession === true);

        rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/user/handleOptional")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(rOptionalSession === false);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .expect(200)
                    .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                    .set("anti-csrf", res1.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .get("/user/id")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        let r4 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(403)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res.body.message);
                        }
                    }
                })
        );
        assert(r4 === "token theft detected");

        let res4 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/logout")
                    .set("Cookie", ["sAccessToken=" + res3.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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

        assert.strictEqual(res4.antiCsrf, undefined);
        assert.strictEqual(res4.accessToken, "");
        assert.strictEqual(res4.refreshToken, "");
        assert.strictEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        await delay(2);
        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert.strictEqual(r5, "try refresh token");
    });

    it("test session verify middleware with driver config", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/custom/user/handleV0", verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/custom/user/handleV1",
            verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/custom/user/handleOptional",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/session/refresh", verifySession(), async (req, res, next) => {
            res.status(200).json({ message: true });
        });

        app.post("/custom/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(errorHandler());

        let res1 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
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

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        assert(r1 === "testing-userId");

        await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        // not passing anti csrf even if requried
        let r2V0 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V0 === "try refresh token");

        let r2V1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV1")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V1 === "try refresh token");

        let rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleOptional")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(rOptionalSession === true);

        rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleOptional")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(rOptionalSession === false);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/custom/session/refresh")
                    .expect(200)
                    .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                    .set("anti-csrf", res1.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .get("/custom/user/id")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        let r4 = await new Promise((resolve) =>
            request(app)
                .post("/custom/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(403)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r4 === "token theft detected");

        let res4 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/custom/logout")
                    .set("Cookie", ["sAccessToken=" + res3.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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

        assert.strictEqual(res4.antiCsrf, undefined);
        assert.strictEqual(res4.accessToken, "");
        assert.strictEqual(res4.refreshToken, "");
        assert.strictEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        await delay(2);
        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert.strictEqual(r5, "try refresh token");
    });

    it("test session verify middleware with driver config with auto refresh", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/custom/user/handleV0", verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/custom/user/handleV1",
            verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/custom/user/handleOptional",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(errorHandler());

        let res1 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
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

        assert(res1.accessTokenHttpOnly);

        assert(res1.refreshTokenHttpOnly);

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        assert(r1 === "testing-userId");

        await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        // not passing anti csrf even if requried
        let r2V0 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V0 === "try refresh token");

        let r2V1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV1")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2V1 === "try refresh token");

        let rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleOptional")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(rOptionalSession === true);

        rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleOptional")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/custom/session/refresh")
                    .expect(200)
                    .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                    .set("anti-csrf", res1.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .get("/custom/user/id")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        let r4 = await new Promise((resolve) =>
            request(app)
                .post("/custom/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(403)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r4 === "token theft detected");

        let res4 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/custom/logout")
                    .set("Cookie", ["sAccessToken=" + res3.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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

        assert.strictEqual(res4.antiCsrf, undefined);
        assert.strictEqual(res4.accessToken, "");
        assert.strictEqual(res4.refreshToken, "");
        assert.strictEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        await delay(2);
        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r5 === "try refresh token");
    });

    // https://github.com/supertokens/supertokens-node/pull/108
    // An expired access token is used and we see that try refresh token error is thrown
    it("test session verify middleware with expired access token and session required false", async function () {
        const connectionURI = await startST({ coreConfig: { access_token_validity: 2 } });

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res, next) => {
                            res.statusCode = 403;
                            return res.json({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get(
            "/custom/user/handle",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(errorHandler());

        let res1 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
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

        assert(res1.accessTokenHttpOnly);

        assert(res1.refreshTokenHttpOnly);

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        assert(r1 === "testing-userId");

        await new Promise((resolve) =>
            request(app)
                .get("/user/handle")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        await new Promise((r) => setTimeout(r, 5000));

        let r2 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handle")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2 === "try refresh token");
    });

    // https://github.com/supertokens/supertokens-node/pull/108
    // A session exists, is refreshed, then is revoked, and then we try and use the access token (after first refresh), and we see that unauthorised error is called.
    it("test session verify middleware with old access token and session required false", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res, next) => {
                            res.statusCode = 403;
                            return res.json({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get(
            "/custom/user/handle",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.get(
            "/custom/user/handle-with-blacklisting",
            verifySession({
                sessionRequired: false,
                checkDatabase: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(errorHandler());

        let res1 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
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

        assert(res1.accessTokenHttpOnly);

        assert(res1.refreshTokenHttpOnly);

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        assert(r1 === "testing-userId");

        await new Promise((resolve) =>
            request(app)
                .get("/user/handle")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/custom/session/refresh")
                    .expect(200)
                    .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                    .set("anti-csrf", res1.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .get("/custom/user/id")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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
            request(app)
                .get("/custom/user/handle")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );

        let res4 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/custom/logout")
                    .set("Cookie", ["sAccessToken=" + res3.accessToken])
                    .set("anti-csrf", res2.antiCsrf)
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

        assert.strictEqual(res4.antiCsrf, undefined);
        assert.strictEqual(res4.accessToken, "");
        assert.strictEqual(res4.refreshToken, "");
        assert.strictEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r2 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handle-with-blacklisting")
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert.strictEqual(r2, "unauthorised");
    });

    // https://github.com/supertokens/supertokens-node/pull/108
    // A session doesn't exist, and we call verifySession, and it let's go through
    it("test session verify middleware with no session and session required false", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res, next) => {
                            res.statusCode = 403;
                            return res.json({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.get(
            "/custom/user/handle",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.use(errorHandler());

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handle")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r1 === false);
    });

    it("test session verify middleware without error handler added", async function () {
        const connectionURI = await startST({ coreConfig: { access_token_validity: 5 } });
        SuperTokens.init({
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
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, recipeUserId, req, res) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({
                                message: "token theft detected",
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("testing-userId"),
                {},
                {}
            );
            res.status(200).json({ message: true });
        });

        app.get("/user/id", verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/user/handleV0", verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/user/handleV1",
            verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/user/handleOptional",
            verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/logout", verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        let res1 = extractInfoFromResponse(await request(app).post("/create").expect(200));
        let r1 = await request(app)
            .get("/user/id")
            .set("Cookie", ["sAccessToken=" + res1.accessToken])
            .set("anti-csrf", res1.antiCsrf)
            .expect(200);
        assert.strictEqual(r1.body.message, "testing-userId");

        await request(app)
            .get("/user/handleV0")
            .set("Cookie", ["sAccessToken=" + res1.accessToken])
            .set("anti-csrf", res1.antiCsrf)
            .expect(200);

        // not passing anti csrf even if requried
        let r2V0 = await request(app)
            .get("/user/handleV0")
            .set("Cookie", ["sAccessToken=" + res1.accessToken])
            .expect(401);
        assert.strictEqual(r2V0.body.message, "try refresh token");

        let r2V1 = await request(app)
            .get("/user/handleV1")
            .set("Cookie", ["sAccessToken=" + res1.accessToken])
            .expect(401);
        assert.strictEqual(r2V1.body.message, "try refresh token");

        let r2Optional = await request(app)
            .get("/user/handleOptional")
            .set("Cookie", ["sAccessToken=" + res1.accessToken])
            .expect(200);
        assert.strictEqual(r2Optional.body.message, true);

        r2Optional = await request(app).get("/user/handleOptional").expect(200);
        assert.strictEqual(r2Optional.body.message, false);

        let res2 = extractInfoFromResponse(
            await request(app)
                .post("/auth/session/refresh")
                .expect(200)
                .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                .set("anti-csrf", res1.antiCsrf)
        );

        let res3 = extractInfoFromResponse(
            await request(app)
                .get("/user/id")
                .set("Cookie", ["sAccessToken=" + res2.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
        );
        await request(app)
            .get("/user/handleV0")
            .set("Cookie", ["sAccessToken=" + res3.accessToken])
            .set("anti-csrf", res2.antiCsrf)
            .expect(200);
        let r4 = await request(app)
            .post("/auth/session/refresh")
            .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
            .set("anti-csrf", res1.antiCsrf)
            .expect(403);
        assert.strictEqual(r4.body.message, "token theft detected");

        let res4 = extractInfoFromResponse(
            await request(app)
                .post("/logout")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
        );

        assert.strictEqual(res4.antiCsrf, undefined);
        assert.strictEqual(res4.accessToken, "");
        assert.strictEqual(res4.refreshToken, "");
        assert.strictEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        await delay(2);
        let r5 = await request(app)
            .get("/user/handleV0")
            .set("Cookie", ["sAccessToken=" + res3.accessToken])
            .expect(401);
        assert.strictEqual(r5.body.message, "try refresh token");
    });
});
