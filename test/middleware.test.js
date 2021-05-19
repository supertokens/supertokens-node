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
    createServerlessCacheForTesting,
} = require("./utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
const { removeServerlessCache } = require("../lib/build/utils");

/**
 * TODO: (Later) check that disabling default API actually disables it (for emailpassword)
 */

describe(`middleware: ${printPath("[test/middleware.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check that disabling default API actually disables it (for session)
    //Failure condition: setting the sessionRefreshFeatures disableDefaultImplementation to false will cause the test to fail
    it("test disabling default API actually disables it", async function () {
        await startST();
        SuperTokens.init({
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
                    sessionRefreshFeature: {
                        disableDefaultImplementation: true,
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(SuperTokens.middleware());
        app.use(SuperTokens.errorHandler());

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
        await startST();
        SuperTokens.init({
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
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
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
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/user/id", Session.verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/user/handleV0", Session.verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/user/handleV1",
            Session.verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/user/handleOptional",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/auth/session/refresh", Session.verifySession(), async (req, res, next) => {
            res.status(200).json({ message: true });
        });

        app.post("/logout", Session.verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(SuperTokens.errorHandler());

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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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

        // not passing id refresh token
        let r3V0 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V0 === "unauthorised");

        let r3V1 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV1")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V1 === "unauthorised");

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .expect(200)
                    .set("Cookie", [
                        "sRefreshToken=" + res1.refreshToken,
                        "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                    ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );
        await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sRefreshToken=" + res1.refreshToken,
                    "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        assert.deepEqual(res4.antiCsrf, undefined);
        assert.deepEqual(res4.accessToken, "");
        assert.deepEqual(res4.refreshToken, "");
        assert.deepEqual(res4.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(res4.idRefreshTokenFromCookie, "");
        assert.deepEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res4.accessToken + ";sIdRefreshToken=" + res4.idRefreshTokenFromCookie,
                ])
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

    it("test session verify middleware with auto refresh", async function () {
        await startST();
        SuperTokens.init({
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
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
                            res.statusCode = 403;
                            return res.json({
                                message: "token theft detected",
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/user/id", Session.verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/user/handleV0", Session.verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/user/handleV1",
            Session.verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/user/handleOptional",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/logout", Session.verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(SuperTokens.errorHandler());

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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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

        // not passing id refresh token
        let r3V0 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V0 === "unauthorised");

        let r3V1 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV1")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V1 === "unauthorised");

        let rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/user/handleOptional")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sRefreshToken=" + res1.refreshToken,
                        "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                    ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );
        await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sRefreshToken=" + res1.refreshToken,
                    "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        assert.deepEqual(res4.antiCsrf, undefined);
        assert.deepEqual(res4.accessToken, "");
        assert.deepEqual(res4.refreshToken, "");
        assert.deepEqual(res4.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(res4.idRefreshTokenFromCookie, "");
        assert.deepEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res4.accessToken + ";sIdRefreshToken=" + res4.idRefreshTokenFromCookie,
                ])
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

    it("test session verify middleware with driver config", async function () {
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
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
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", Session.verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/custom/user/handleV0", Session.verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/custom/user/handleV1",
            Session.verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/custom/user/handleOptional",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/session/refresh", Session.verifySession(), async (req, res, next) => {
            res.status(200).json({ message: true });
        });

        app.post("/custom/logout", Session.verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(SuperTokens.errorHandler());

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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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

        // not passing id refresh token
        let r3V0 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V0 === "unauthorised");

        let r3V1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV1")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V1 === "unauthorised");

        let rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleOptional")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sRefreshToken=" + res1.refreshToken,
                        "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                    ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sRefreshToken=" + res1.refreshToken,
                    "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        assert.deepEqual(res4.antiCsrf, undefined);
        assert.deepEqual(res4.accessToken, "");
        assert.deepEqual(res4.refreshToken, "");
        assert.deepEqual(res4.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(res4.idRefreshTokenFromCookie, "");
        assert.deepEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res4.accessToken + ";sIdRefreshToken=" + res4.idRefreshTokenFromCookie,
                ])
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

    it("test session verify middleware with driver config with auto refresh", async function () {
        await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
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

        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", Session.verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/custom/user/handleV0", Session.verifySession({ antiCsrfCheck: true }), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.get(
            "/custom/user/handleV1",
            Session.verifySession({
                antiCsrfCheck: true,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            }
        );

        app.get(
            "/custom/user/handleOptional",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/logout", Session.verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(SuperTokens.errorHandler());

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
        assert(res1.idRefreshTokenHttpOnly);
        assert(res1.refreshTokenHttpOnly);

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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

        // not passing id refresh token
        let r3V0 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V0 === "unauthorised");

        let r3V1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV1")
                .expect(401)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r3V1 === "unauthorised");

        let rOptionalSession = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleOptional")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sRefreshToken=" + res1.refreshToken,
                        "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                    ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sRefreshToken=" + res1.refreshToken,
                    "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        assert.deepEqual(res4.antiCsrf, undefined);
        assert.deepEqual(res4.accessToken, "");
        assert.deepEqual(res4.refreshToken, "");
        assert.deepEqual(res4.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(res4.idRefreshTokenFromCookie, "");
        assert.deepEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r5 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handleV0")
                .set("Cookie", [
                    "sAccessToken=" + res4.accessToken + ";sIdRefreshToken=" + res4.idRefreshTokenFromCookie,
                ])
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
        await setKeyValueInConfig("access_token_validity", 2);
        await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
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

        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", Session.verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get(
            "/custom/user/handle",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/logout", Session.verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(SuperTokens.errorHandler());

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
        assert(res1.idRefreshTokenHttpOnly);
        assert(res1.refreshTokenHttpOnly);

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
        await setKeyValueInConfig("access_token_blacklisting", true);
        await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
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

        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/custom/user/id", Session.verifySession(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get(
            "/custom/user/handle",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.post("/custom/logout", Session.verifySession(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use(SuperTokens.errorHandler());

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
        assert(res1.idRefreshTokenHttpOnly);
        assert(res1.refreshTokenHttpOnly);

        let r1 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/id")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sRefreshToken=" + res1.refreshToken,
                        "sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                    ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handle")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
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
                    .set("Cookie", [
                        "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
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
            )
        );

        assert.deepEqual(res4.antiCsrf, undefined);
        assert.deepEqual(res4.accessToken, "");
        assert.deepEqual(res4.refreshToken, "");
        assert.deepEqual(res4.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(res4.idRefreshTokenFromCookie, "");
        assert.deepEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r2 = await new Promise((resolve) =>
            request(app)
                .get("/custom/user/handle")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie,
                ])
                .expect(401)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r2 === "unauthorised");
    });

    // https://github.com/supertokens/supertokens-node/pull/108
    // A session doesn't exist, and we call verifySession, and it let's go through
    it("test session verify middleware with no session and session required false", async function () {
        await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/custom",
            },
            recipeList: [
                Session.init({
                    cookieDomain: "test-driver",
                    cookieSecure: true,
                    cookieSameSite: "strict",
                    errorHandlers: {
                        onTokenTheftDetected: (sessionHandle, userId, req, res, next) => {
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

        app.use(SuperTokens.middleware());

        app.get(
            "/custom/user/handle",
            Session.verifySession({
                sessionRequired: false,
            }),
            async (req, res) => {
                res.status(200).json({ message: req.session !== undefined });
            }
        );

        app.use(SuperTokens.errorHandler());

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
});
