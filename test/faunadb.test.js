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
    stopST,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
} = require("./utils");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let RecipeImplementation = require("../recipe/session/faunadb").default;
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let { maxVersion } = require("../lib/build/utils");
let faunadb = require("faunadb");
const q = faunadb.query;

describe(`faunaDB: ${printPath("[test/faunadb.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("checking FDAT lifetime", async function () {
        await setKeyValueInConfig("access_token_validity", "3");
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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                accessFaunadbTokenFromFrontend: true,
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();
        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", Session.verifySession(), async (req, res) => {
            let jwtPayload = req.session.getJWTPayload();
            let token = await req.session.getFaunadbToken();
            if (token === undefined) {
                res.status(200).send("fail");
            } else {
                if (token === jwtPayload.faunadbToken) {
                    res.status(200).send("pass");
                } else {
                    res.status(200).send("fail");
                }
            }
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let frontToken = JSON.parse(Buffer.from(res.frontToken, "base64").toString());

        let token = frontToken.up.faunadbToken;

        let faunaDBClient = new faunadb.Client({
            secret: token,
        });

        let faunaResponse = await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));

        assert(faunaResponse.data.name === "test user 1");

        await new Promise((r) => setTimeout(r, 7000));

        try {
            await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));
            throw new Error("fail");
        } catch (err) {
            if (err.message !== "unauthorized" || err.name !== "Unauthorized") {
                throw new Error("fail");
            }
        }

        // refresh session and repeat the above
        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let frontToken2 = JSON.parse(Buffer.from(res3.frontToken, "base64").toString());

        let token2 = frontToken2.up.faunadbToken;

        assert(token2 !== token);

        faunaDBClient = new faunadb.Client({
            secret: token2,
        });

        faunaResponse = await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));

        assert(faunaResponse.data.name === "test user 1");

        await new Promise((r) => setTimeout(r, 7000));

        try {
            await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));
            throw new Error("fail");
        } catch (err) {
            if (err.message !== "unauthorized" || err.name !== "Unauthorized") {
                throw new Error("fail");
            }
        }
    });

    it("faunadb test signout API works", async function () {
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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                accessFaunadbTokenFromFrontend: true,
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });
        const app = express();
        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
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

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
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

    it("getting FDAT from JWT payload", async function () {
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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                accessFaunadbTokenFromFrontend: true,
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();
        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", Session.verifySession(), async (req, res) => {
            let jwtPayload = req.session.getJWTPayload();
            let token = await req.session.getFaunadbToken();
            if (token === undefined) {
                res.status(200).send("fail");
            } else {
                if (token === jwtPayload.faunadbToken) {
                    res.status(200).send("pass");
                } else {
                    res.status(200).send("fail");
                }
            }
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res.text);
                })
        );

        assert(res2 === "pass");

        let frontToken = JSON.parse(Buffer.from(res.frontToken, "base64").toString());

        let token = frontToken.up.faunadbToken;

        let faunaDBClient = new faunadb.Client({
            secret: token,
        });

        let faunaResponse = await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));

        assert(faunaResponse.data.name === "test user 1");

        // refresh session and repeat the above
        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        res4 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res3.antiCsrf)
                .end((err, res) => {
                    resolve(res.text);
                })
        );

        assert(res4 === "pass");

        let frontToken2 = JSON.parse(Buffer.from(res3.frontToken, "base64").toString());

        let token2 = frontToken2.up.faunadbToken;

        assert(token2 !== token);

        faunaDBClient = new faunadb.Client({
            secret: token2,
        });

        faunaResponse = await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));

        assert(faunaResponse.data.name === "test user 1");
    });

    it("getting FDAT from session data", async function () {
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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();
        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", Session.verifySession(), async (req, res) => {
            let sessionData = await req.session.getSessionData();
            let token = await req.session.getFaunadbToken();
            if (token === undefined) {
                res.status(200).send("fail");
            } else {
                if (token === sessionData.faunadbToken) {
                    res.status(200).send("pass");
                } else {
                    res.status(200).send("fail");
                }
            }
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        res = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res.text);
                })
        );

        assert(res === "pass");
    });

    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////// THE TESTS BELOW ARE A COPY OF THE TESTS//////////////
    /////////////////// IN sessionExpress.test.js ////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////

    //- check for token theft detection
    it("express token theft detection with faunadb", async function () {
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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
            res.status(200).send("");
        });

        app.post("/auth/session/refresh", async (req, res) => {
            try {
                await Session.refreshSession(req, res);
                res.status(200).send(JSON.stringify({ success: false }));
            } catch (err) {
                res.status(200).json({
                    success: err.type === Session.Error.TOKEN_THEFT_DETECTED,
                });
            }
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise((resolve) =>
            request(app)
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
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(res3.body.success, true);

        let cookies = extractInfoFromResponse(res3);
        assert.deepEqual(cookies.antiCsrf, undefined);
        assert.deepEqual(cookies.accessToken, "");
        assert.deepEqual(cookies.refreshToken, "");
        assert.deepEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(cookies.idRefreshTokenFromCookie, "");
        assert.deepEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        let currCDIVersion = await Querier.getNewInstanceOrThrowError(false).getAPIVersion();
        if (maxVersion(currCDIVersion, "2.1") === "2.1") {
            assert(cookies.accessTokenDomain === "localhost" || cookies.accessTokenDomain === "supertokens.io");
            assert(cookies.refreshTokenDomain === "localhost" || cookies.refreshTokenDomain === "supertokens.io");
            assert(cookies.idRefreshTokenDomain === "localhost" || cookies.idRefreshTokenDomain === "supertokens.io");
        } else {
            assert(cookies.accessTokenDomain === undefined);
            assert(cookies.refreshTokenDomain === undefined);
            assert(cookies.idRefreshTokenDomain === undefined);
        }
    });

    //- check for token theft detection
    it("express token theft detection with auto refresh middleware with faunadb", async function () {
        await startST();
        const app = express();

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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                accessFaunadbTokenFromFrontend: true,
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", Session.verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.use(SuperTokens.errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise((resolve) =>
            request(app)
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
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert(res3.status === 401);
        assert.deepEqual(res3.text, '{"message":"token theft detected"}');

        let cookies = extractInfoFromResponse(res3);
        assert.deepEqual(cookies.antiCsrf, undefined);
        assert.deepEqual(cookies.accessToken, "");
        assert.deepEqual(cookies.refreshToken, "");
        assert.deepEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(cookies.idRefreshTokenFromCookie, "");
        assert.deepEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    //check basic usage of session
    it("test basic usage of express sessions with faunadb", async function () {
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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                accessFaunadbTokenFromFrontend: true,
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res, true);
            res.status(200).send("");
        });
        app.post("/auth/session/refresh", async (req, res) => {
            await Session.refreshSession(req, res);
            res.status(200).send("");
        });
        app.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res, true);
            await session.revokeSession();
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
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
                request(app)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
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
    it("test basic usage of express sessions with auto refresh with faunadb", async function () {
        await startST();

        const app = express();

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
                    override: {
                        functions: (oI) => {
                            return new RecipeImplementation(oI, {
                                userCollectionName: "users",
                                faunaDBClient: new faunadb.Client({
                                    secret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                                }),
                            });
                        },
                    },
                }),
            ],
        });

        app.use(SuperTokens.middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", Session.verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.post("/session/revoke", Session.verifySession(), async (req, res) => {
            let session = req.session;
            await session.revokeSession();
            res.status(200).send("");
        });

        app.use(SuperTokens.errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
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
                request(app)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
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
});
