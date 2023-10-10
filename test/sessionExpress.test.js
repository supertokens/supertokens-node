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
    setKeyValueInConfig,
    delay,
} = require("./utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let { Querier } = require("../lib/build/querier");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
const { verifySession } = require("../recipe/session/framework/express");
const { default: next } = require("next");
let { middleware, errorHandler } = require("../framework/express");

describe(`sessionExpress: ${printPath("[test/sessionExpress.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check if disabling api, the default refresh API does not work - you get a 404
    it("test that if disabling api, the default refresh API does not work", async function () {
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

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .set("st-auth-mode", "cookie")
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
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(res2.status === 404);
    });

    it("test that if disabling api, the default sign out API does not work", async function () {
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
                                signOutPOST: undefined,
                            };
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .set("st-auth-mode", "cookie")
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
            request(app)
                .post("/auth/signout")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(res2.status === 404);
    });

    //- check for token theft detection
    it("express token theft detection", async function () {
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
                        onTokenTheftDetected: async (sessionHandle, userId, recipeUserId, request, response) => {
                            response.sendJSONResponse({
                                success: true,
                            });
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            res.status(200).send("");
        });

        app.post("/auth/session/refresh", async (req, res, next) => {
            try {
                await Session.refreshSession(req, res);
                res.status(200).send(JSON.stringify({ success: false }));
            } catch (err) {
                next(err);
            }
        });

        app.use(errorHandler());

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

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res2.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
    });

    //- check for token theft detection
    it("express token theft detection with auto refresh middleware", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res2.accessToken])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
        assert.deepStrictEqual(res3.text, '{"message":"token theft detected"}');

        let cookies = extractInfoFromResponse(res3);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, "");
        assert.strictEqual(cookies.refreshToken, "");
        assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    //check basic usage of session
    it("test basic usage of express sessions", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            res.status(200).send("");
        });
        app.post("/auth/session/refresh", async (req, res) => {
            await Session.refreshSession(req, res);
            res.status(200).send("");
        });
        app.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.revokeSession();
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

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
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
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
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
            request(app)
                .post("/session/revoke")
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
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("test basic usage of express sessions with headers", async function () {
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
                    antiCsrf: "VIA_TOKEN",
                    getTokenTransferMethod: () => "header",
                }),
            ],
        });

        const app = express();

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await Session.getSession(req, res);
            res.status(200).send("");
        });
        app.post("/auth/session/refresh", async (req, res) => {
            await Session.refreshSession(req, res);
            res.status(200).send("");
        });
        app.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.revokeSession();
            res.status(200).send("");
        });
        app.use(errorHandler());

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

        assert(res.antiCsrf === undefined);

        assert.ok(res.accessTokenFromHeader);
        assert.strictEqual(res.accessToken, undefined);

        assert.ok(res.refreshTokenFromHeader);
        assert.strictEqual(res.refreshToken, undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Authorization", `Bearer ${res.accessTokenFromHeader}`)
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
                request(app)
                    .post("/auth/session/refresh")
                    .set("Authorization", `Bearer ${res.refreshTokenFromHeader}`)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            )
        );

        assert(res2.antiCsrf === undefined);
        assert.ok(res2.accessTokenFromHeader);
        assert.strictEqual(res2.accessToken, undefined);

        assert.ok(res2.refreshTokenFromHeader);
        assert.strictEqual(res2.refreshToken, undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Authorization", `Bearer ${res2.accessTokenFromHeader}`)
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
        assert(res3.accessTokenFromHeader !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Authorization", `Bearer ${res3.accessTokenFromHeader}`)

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
            request(app)
                .post("/session/revoke")
                .set("Authorization", `Bearer ${res3.accessTokenFromHeader}`)

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

        assert.strictEqual(sessionRevokedResponseExtracted.accessTokenFromHeader, "");
        assert.strictEqual(sessionRevokedResponseExtracted.refreshTokenFromHeader, "");
    });

    it("test that if accessTokenPath is set to custom /access, then path of accessToken from session is equal to this", async function () {
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
                    accessTokenPath: "/access",
                }),
            ],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });
        const res = await new Promise((resolve) =>
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
        );
        let cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
        cookies = cookies === undefined ? [] : cookies;

        const paths = cookies.filter((item) => item.startsWith("sAccessToken"))[0].split("; ");
        assert.strictEqual(
            ["path", "Path"].flatMap((need) => paths.filter((actual) => actual.startsWith(need)))[0].split("=")[1],
            "/access"
        );
    });

    it("test that if default accessTokenPath is used, then path of accessToken from session is equal to slash", async function () {
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
                }),
            ],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });
        const res = await new Promise((resolve) =>
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
        );
        let cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
        cookies = cookies === undefined ? [] : cookies;

        const paths = cookies.filter((item) => item.startsWith("sAccessToken"))[0].split("; ");
        assert.strictEqual(
            ["path", "Path"].flatMap((need) => paths.filter((actual) => actual.startsWith(need)))[0].split("=")[1],
            "/"
        );
    });

    it("test signout API works", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
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
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("test signout API works if even session is deleted on the backend after creation", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        const app = express();
        app.use(middleware());

        let sessionHandle = "";

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId(""),
                {},
                {}
            );
            sessionHandle = session.getHandle();
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

        await Session.revokeSession(sessionHandle);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signout")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    //check basic usage of session
    it("test basic usage of express sessions with auto refresh", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
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

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.post("/session/revoke", verifySession(), async (req, res) => {
            let session = req.session;
            await session.revokeSession();
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
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
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
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
            request(app)
                .post("/session/revoke")
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
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    //check session verify for with / without anti-csrf present
    it("test express session verify with anti-csrf present", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res);
            res.status(200).json({ userId: sessionResponse.userId });
        });

        app.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res, false);
            res.status(200).json({ userId: sessionResponse.userId });
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
            request(app)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            try {
                let sessionResponse = await Session.getSession(req, res, { antiCsrfCheck: true });
                res.status(200).json({ success: false });
            } catch (err) {
                res.status(200).json({
                    success: err.type === Session.Error.TRY_REFRESH_TOKEN,
                });
            }
        });

        app.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res, { antiCsrfCheck: false });
            res.status(200).json({ userId: sessionResponse.userId });
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

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });
        app.post("/usercreate", async (req, res) => {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId("someUniqueUserId"),
                {},
                {}
            );
            res.status(200).send("");
        });
        app.post("/session/revoke", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.revokeSession();
            res.status(200).send("");
        });

        app.post("/session/revokeUserid", async (req, res) => {
            let session = await Session.getSession(req, res);
            await Session.revokeAllSessionsForUser(session.getUserId());
            res.status("200").send("");
        });

        //create an api call get sesssions from a userid "id1" that returns all the sessions for that userid
        app.post("/session/getSessionsWithUserId1", async (req, res) => {
            let sessionHandles = await Session.getAllSessionHandlesForUser("someUniqueUserId");
            res.status(200).json(sessionHandles);
        });

        let response = extractInfoFromResponse(
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
                .post("/session/revoke")
                .set("Cookie", ["sAccessToken=" + response.accessToken])
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
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");

        await new Promise((resolve) =>
            request(app)
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
                request(app)
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
            request(app)
                .post("/session/revokeUserid")
                .set("Cookie", ["sAccessToken=" + userCreateResponse.accessToken])
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
            request(app)
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });
        app.post("/updateSessionData", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.updateSessionDataInDatabase({ key: "value" });
            res.status(200).send("");
        });
        app.post("/getSessionData", async (req, res) => {
            let session = await Session.getSession(req, res);
            let sessionData = await session.getSessionDataFromDatabase();
            res.status(200).json(sessionData);
        });

        app.post("/updateSessionData2", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.updateSessionDataInDatabase(null);
            res.status(200).send("");
        });

        app.post("/updateSessionDataInvalidSessionHandle", async (req, res) => {
            res.status(200).json({
                success: !(await Session.updateSessionDataInDatabase("InvalidHandle", { key: "value3" })),
            });
        });

        //create a new session
        let response = extractInfoFromResponse(
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

        //call the updateSessionData api to add session data
        await new Promise((resolve) =>
            request(app)
                .post("/updateSessionData")
                .set("Cookie", ["sAccessToken=" + response.accessToken])
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
            request(app)
                .post("/getSessionData")
                .set("Cookie", ["sAccessToken=" + response.accessToken])
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
            request(app)
                .post("/updateSessionData2")
                .set("Cookie", ["sAccessToken=" + response.accessToken])
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
            request(app)
                .post("/getSessionData")
                .set("Cookie", ["sAccessToken=" + response.accessToken])
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
            request(app)
                .post("/updateSessionDataInvalidSessionHandle")
                .set("Cookie", ["sAccessToken=" + response.accessToken])
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("user1"), {}, {});
            res.status(200).send("");
        });
        app.post("/updateAccessTokenPayload", async (req, res) => {
            let session = await Session.getSession(req, res);
            let accessTokenBefore = session.accessToken;
            await session.mergeIntoAccessTokenPayload({ key: "value" });
            let accessTokenAfter = session.accessToken;
            let statusCode = accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === "string" ? 200 : 500;
            res.status(statusCode).send("");
        });
        app.post("/auth/session/refresh", async (req, res) => {
            await Session.refreshSession(req, res);
            res.status(200).send("");
        });
        app.post("/getAccessTokenPayload", async (req, res) => {
            let session = await Session.getSession(req, res);
            let jwtPayload = session.getAccessTokenPayload();
            res.status(200).json(jwtPayload);
        });

        app.post("/updateAccessTokenPayload2", async (req, res) => {
            let session = await Session.getSession(req, res);
            await session.mergeIntoAccessTokenPayload({ key: null });
            res.status(200).send("");
        });

        app.post("/updateAccessTokenPayloadInvalidSessionHandle", async (req, res) => {
            res.status(200).json({
                success: !(await Session.mergeIntoAccessTokenPayload("InvalidHandle", { key: "value3" })),
            });
        });

        //create a new session
        let response = extractInfoFromResponse(
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

        let frontendInfo = JSON.parse(new Buffer.from(response.frontToken, "base64").toString());
        assert(frontendInfo.uid === "user1");
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 10);

        //call the updateAccessTokenPayload api to add jwt payload
        let updatedResponse = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/updateAccessTokenPayload")
                    .set("Cookie", ["sAccessToken=" + response.accessToken])
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
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.key, "value");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 11);

        //call the getAccessTokenPayload api to get jwt payload
        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/getAccessTokenPayload")
                .set("Cookie", ["sAccessToken=" + updatedResponse.accessToken])
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
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + response.refreshToken])
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
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.key, "value");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 11);

        // change the value of the inserted jwt payload
        let updatedResponse2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/updateAccessTokenPayload2")
                    .set("Cookie", ["sAccessToken=" + response2.accessToken])
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
        assert.strictEqual(frontendInfo.up.sub, "user1");
        assert.strictEqual(frontendInfo.up.exp, Math.floor(frontendInfo.ate / 1000));
        assert.strictEqual(Object.keys(frontendInfo.up).length, 10);

        //retrieve the changed jwt payload
        response2 = await new Promise((resolve) =>
            request(app)
                .post("/getAccessTokenPayload")
                .set("Cookie", ["sAccessToken=" + updatedResponse2.accessToken])
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
        assert.deepStrictEqual(
            new Set(Object.keys(response2.body)),
            new Set([
                "antiCsrfToken",
                "exp",
                "iat",
                "iss",
                "parentRefreshTokenHash1",
                "refreshTokenHash1",
                "sessionHandle",
                "sub",
                "tId",
                "rsub",
            ])
        );
        assert.strictEqual(response2.body.iss, "https://api.supertokens.io/auth");
        //invalid session handle when updating the jwt payload
        let invalidSessionResponse = await new Promise((resolve) =>
            request(app)
                .post("/updateAccessTokenPayloadInvalidSessionHandle")
                .set("Cookie", ["sAccessToken=" + updatedResponse2.accessToken])
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

    // test with existing header params being there and that the lib appends to those and not overrides those
    it("test that express appends to existing header params and does not override", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        const app = express();
        app.post("/create", async (req, res) => {
            res.header("testHeader", "testValue");
            res.header("Access-Control-Expose-Headers", "customValue");
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        //create a new session

        let response = await new Promise((resolve) =>
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
        );
        assert.strictEqual(response.headers.testheader, "testValue");
        assert.deepEqual(response.headers["access-control-expose-headers"], "customValue, front-token, anti-csrf");

        //normal session headers
        let extractInfo = extractInfoFromResponse(response);
        assert(extractInfo.accessToken !== undefined);
        assert(extractInfo.refreshToken != undefined);
        assert(extractInfo.antiCsrf !== undefined);
    });

    //if anti-csrf is disabled from ST core, check that not having that in input to verify session is fine**
    it("test that when anti-csrf is disabled from from ST core, not having to input in verify session is fine in express", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "NONE" })],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res);
            res.status(200).json({ userId: sessionResponse.userId });
        });
        app.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await Session.getSession(req, res, false);
            res.status(200).json({ userId: sessionResponse.userId });
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
            request(app)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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

    it("test that getSession does not clear cookies if a session does not exist in the first place", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();

        app.post("/session/verify", async (req, res) => {
            try {
                await Session.getSession(req, res);
            } catch (err) {
                if (err.type === Session.Error.UNAUTHORISED) {
                    res.status(200).json({ success: true });
                    return;
                }
            }
            res.status(200).json({ success: false });
        });

        let res = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.strictEqual(res.body.success, true);

        let cookies = extractInfoFromResponse(res);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, undefined);
        assert.strictEqual(cookies.refreshToken, undefined);
        assert.strictEqual(cookies.accessTokenExpiry, undefined);
        assert.strictEqual(cookies.refreshTokenExpiry, undefined);
    });

    it("test that refreshSession does not clear cookies if a session does not exist in the first place", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const app = express();

        app.post("/auth/session/refresh", async (req, res) => {
            try {
                await Session.refreshSession(req, res);
            } catch (err) {
                if (err.type === Session.Error.UNAUTHORISED) {
                    res.status(200).json({ success: true });
                    return;
                }
            }
            res.status(200).json({ success: false });
        });

        let res = await new Promise((resolve) =>
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

        assert.strictEqual(res.body.success, true);

        let cookies = extractInfoFromResponse(res);
        assert.strictEqual(cookies.antiCsrf, undefined);
        assert.strictEqual(cookies.accessToken, undefined);
        assert.strictEqual(cookies.refreshToken, undefined);
        assert.strictEqual(cookies.accessTokenExpiry, undefined);
        assert.strictEqual(cookies.refreshTokenExpiry, undefined);
    });

    it("test that when anti-csrf is enabled with custom header, and we don't provide that in verifySession, we get try refresh token", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_CUSTOM_HEADER" })],
        });

        const app = express();
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            let sessionResponse = req.session;
            res.status(200).json({ userId: sessionResponse.userId });
        });
        app.post("/session/verify-optional", verifySession({ sessionRequired: false }), async (req, res) => {
            let sessionResponse = req.session;
            res.status(200).json({ hasSession: !!sessionResponse });
        });
        app.post("/session/verifyAntiCsrfFalse", verifySession({ antiCsrfCheck: false }), async (req, res) => {
            let sessionResponse = req.session;
            res.status(200).json({ userId: sessionResponse.userId });
        });

        app.use(errorHandler());

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

        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res2.status, 401);
            assert.deepStrictEqual(res2.text, '{"message":"try refresh token"}');

            let res3 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .set("rid", "session")
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res3.body.userId, "id1");
        }

        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verify-optional")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res2.status, 401);
            assert.deepStrictEqual(res2.text, '{"message":"try refresh token"}');

            let res3 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verify-optional")
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.notStrictEqual(res3.text, '{"message":"try refresh token"}');
            assert.deepStrictEqual(res3.body.hasSession, false);
        }
        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verifyAntiCsrfFalse")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res2.body.userId, "id1");

            let res3 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verifyAntiCsrfFalse")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .set("rid", "session")
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res3.body.userId, "id1");
        }
    });

    it("test resfresh API when using CUSTOM HEADER anti-csrf", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_CUSTOM_HEADER" })],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(res2.status, 401);
            assert.deepStrictEqual(res2.text, '{"message":"unauthorised"}');
        }

        {
            let res2 = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("rid", "session")
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(res2.status, 200);
        }
    });

    it("test that init can be called post route and middleware declaration", async function () {
        const connectionURI = await startST();

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("id1"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            let sessionResponse = req.session;
            res.status(200).json({ userId: sessionResponse.userId });
        });
        app.post("/session/verifyAntiCsrfFalse", verifySession(false), async (req, res) => {
            let sessionResponse = req.session;
            res.status(200).json({ userId: sessionResponse.userId });
        });

        app.use(errorHandler());

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_CUSTOM_HEADER" })],
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

        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res2.status, 401);
            assert.deepStrictEqual(res2.text, '{"message":"try refresh token"}');

            let res3 = await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
                    .set("rid", "session")
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(res3.body.userId, "id1");
        }
    });

    it("test overriding of sessions functions", async function () {
        const connectionURI = await startST();

        let createNewSessionCalled = false;
        let getSessionCalled = false;
        let refreshSessionCalled = false;
        let session = undefined;
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async (input) => {
                                    let response = await oI.createNewSession(input);
                                    createNewSessionCalled = true;
                                    session = response;
                                    return response;
                                },
                                getSession: async (input) => {
                                    let response = await oI.getSession(input);
                                    getSessionCalled = true;
                                    session = response;
                                    return response;
                                },
                                refreshSession: async (input) => {
                                    let response = await oI.refreshSession(input);
                                    refreshSessionCalled = true;
                                    session = response;
                                    return response;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.post("/session/revoke", verifySession(), async (req, res) => {
            let session = req.session;
            await session.revokeSession();
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        assert.strictEqual(createNewSessionCalled, true);
        assert.notStrictEqual(session, undefined);
        assert(res.accessToken !== undefined);
        assert.strictEqual(session.getAccessToken(), decodeURIComponent(res.accessToken));
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);
        session = undefined;

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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

        assert.strictEqual(refreshSessionCalled, true);
        assert.notStrictEqual(session, undefined);
        assert(res2.accessToken !== undefined);
        assert.strictEqual(session.getAccessToken(), decodeURIComponent(res2.accessToken));
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);
        session = undefined;

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", ["sAccessToken=" + res2.accessToken])
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
        assert.strictEqual(getSessionCalled, true);
        assert.notStrictEqual(session, undefined);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);
        assert.strictEqual(session.getAccessToken(), decodeURIComponent(res3.accessToken));

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res3.accessToken])
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
            request(app)
                .post("/session/revoke")
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
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("test overriding of sessions apis", async function () {
        const connectionURI = await startST();

        let signoutCalled = false;
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signOutPOST: async (input) => {
                                    let response = await oI.signOutPOST(input);
                                    signoutCalled = true;
                                    return response;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/signout")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
                .set("anti-csrf", res.antiCsrf)
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
        assert.strictEqual(signoutCalled, true);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
    });

    it("test overriding of sessions functions, error thrown", async function () {
        const connectionURI = await startST();

        let createNewSessionCalled = false;
        let session = undefined;
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async (input) => {
                                    let response = await oI.createNewSession(input);
                                    createNewSessionCalled = true;
                                    session = response;
                                    throw {
                                        error: "create new session error",
                                    };
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res, next) => {
            try {
                await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
                res.status(200).send("");
            } catch (err) {
                next(err);
            }
        });

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            res.json({
                customError: true,
                ...err,
            });
        });

        let res = await new Promise((resolve) =>
            request(app)
                .post("/create")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.strictEqual(createNewSessionCalled, true);
        assert.notStrictEqual(session, undefined);
        assert.deepStrictEqual(res, { customError: true, error: "create new session error" });
    });

    it("test overriding of sessions apis, error thrown", async function () {
        const connectionURI = await startST();

        let signoutCalled = false;
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiBasePath: "/",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signOutPOST: async (input) => {
                                    let response = await oI.signOutPOST(input);
                                    signoutCalled = true;
                                    throw {
                                        error: "signout error",
                                    };
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", verifySession(), async (req, res) => {
            res.status(200).send("");
        });

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            res.json({
                customError: true,
                ...err,
            });
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

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/signout")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
                .set("anti-csrf", res.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert.strictEqual(signoutCalled, true);
        assert.deepStrictEqual(sessionRevokedResponse, { customError: true, error: "signout error" });
    });

    it("check that refresh doesn't clear cookies if missing anti csrf via custom header", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_CUSTOM_HEADER" })],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(res2.status, 401);
            assert.deepStrictEqual(res2.text, '{"message":"unauthorised"}');
            let sessionRevokedResponseExtracted = extractInfoFromResponse(res2);
        }
    });

    it("check that refresh doesn't clear cookies if missing anti csrf via token", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });
        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        {
            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(res2.status, 401);
            assert.deepStrictEqual(res2.text, '{"message":"unauthorised"}');
        }
    });

    it("test session error handler overriding", async function () {
        const connectionURI = await startST();
        let testpass = false;
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
                        onUnauthorised: async (message, request, response) => {
                            await new Promise((r) =>
                                setTimeout(() => {
                                    testpass = true;
                                    r();
                                }, 5000)
                            );
                            throw Error("onUnauthorised error caught");
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.post("/session/verify", async (req, res, next) => {
            try {
                await Session.getSession(req, res);
                res.status(200).send("");
            } catch (err) {
                next(err);
            }
        });

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            if (err.message === "onUnauthorised error caught") {
                res.status(403);
                res.json({});
            }
        });

        let response = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .expect(403)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.status, 403);
        assert(testpass);
    });

    it("test revoking a session during refresh with revokeSession function", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
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
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                refreshPOST: async function (input) {
                                    let session = await oI.refreshPOST(input);
                                    await session.revokeSession();
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .set("st-auth-mode", "cookie")
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

        assert.notStrictEqual(res.accessToken, undefined);
        assert.notStrictEqual(res.antiCsrf, undefined);
        assert.notStrictEqual(res.refreshToken, undefined);

        let resp = await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(resp.status === 200);

        let res2 = extractInfoFromResponse(resp);

        assert.deepEqual(res2.accessToken, "");
        assert.deepEqual(res2.refreshToken, "");
        assert.deepEqual(res2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(res2.accessTokenDomain === undefined);
        assert(res2.refreshTokenDomain === undefined);
        assert.strictEqual(res2.frontToken, "remove");
        assert.strictEqual(res2.antiCsrf, undefined);
    });

    it("test revoking a session during refresh with revokeSession function and sending 401", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
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
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                refreshPOST: async function (input) {
                                    let session = await oI.refreshPOST(input);
                                    await session.revokeSession();
                                    input.options.res.setStatusCode(401);
                                    input.options.res.sendJSONResponse({});
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .set("st-auth-mode", "cookie")
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
        assert(res.refreshToken !== undefined);

        let resp = await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(resp.status === 401);

        let res2 = extractInfoFromResponse(resp);

        assert.deepEqual(res2.accessToken, "");
        assert.deepEqual(res2.refreshToken, "");
        assert.deepEqual(res2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(res2.accessTokenDomain === undefined);
        assert(res2.refreshTokenDomain === undefined);
        assert.strictEqual(res2.frontToken, "remove");
        assert.strictEqual(res2.antiCsrf, undefined);
    });

    it("test revoking a session during refresh with throwing unauthorised error", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
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

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .set("st-auth-mode", "cookie")
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
        assert(res.refreshToken !== undefined);

        let resp = await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sAccessToken=" + res.accessToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(resp.status === 401);

        let res2 = extractInfoFromResponse(resp);

        assert.strictEqual(res2.accessToken, "");
        assert.strictEqual(res2.refreshToken, "");
        assert.strictEqual(res2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(res2.accessTokenDomain, undefined);
        assert.strictEqual(res2.refreshTokenDomain, undefined);
        assert.strictEqual(res2.frontToken, "remove");
        assert.strictEqual(res2.antiCsrf, undefined);
    });

    it("test revoking a session during refresh fails if just sending 401", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
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
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                refreshPOST: async function (input) {
                                    let session = await oI.refreshPOST(input);
                                    input.options.res.setStatusCode(401);
                                    input.options.res.sendJSONResponse({});
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .set("st-auth-mode", "cookie")
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
        assert(res.refreshToken !== undefined);

        let resp = await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(resp.status === 401);

        let res2 = extractInfoFromResponse(resp);

        assert(res2.accessToken.length > 1);
        assert(res2.antiCsrf.length > 1);
        assert(res2.refreshToken.length > 1);
    });

    it("Test that token transfer method works correctly when using origin function", async function () {
        const connectionURI = await startST();

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ request }) => {
                    if (request.getHeaderValue("origin") !== undefined) {
                        return request.getHeaderValue("origin");
                    }

                    return "localhost:3000";
                },
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: ({ req }) => {
                        if (req.getHeaderValue("origin") === "http://localhost:3002") {
                            return "cookie";
                        }

                        return "header";
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId(""), {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

        let res = await new Promise((resolve) =>
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
        );

        let headers = res.headers;
        assert(headers["st-access-token"] !== undefined);
        assert(headers["st-refresh-token"] !== undefined);
        assert(headers["set-cookie"] === undefined);

        res = await new Promise((resolve) =>
            request(app)
                .post("/create")
                .set("origin", "http://localhost:3002")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        headers = res.headers;

        assert(headers["st-access-token"] === undefined);
        assert(headers["st-refresh-token"] === undefined);
        assert(headers["set-cookie"] !== undefined);
    });
});
