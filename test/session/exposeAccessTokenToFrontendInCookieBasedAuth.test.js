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
const assert = require("assert");
const express = require("express");
const request = require("supertest");
const { ProcessState } = require("../../lib/build/processState");
const SuperTokens = require("../..");
const Session = require("../../recipe/session");
const { middleware, errorHandler } = require("../../framework/express");
const { verifySession } = require("../../recipe/session/framework/express");
const { json } = require("body-parser");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`exposeAccessTokenToFrontendInCookieBasedAuth: ${printPath(
    "[test/session/exposeAccessTokenToFrontendInCookieBasedAuth.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("should default to false", () => {
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
        assert.strictEqual(
            SessionRecipe.getInstanceOrThrowError().config.exposeAccessTokenToFrontendInCookieBasedAuth,
            false
        );
    });

    getTestCases(true);
    getTestCases(false);
});

function getTestCases(exposeAccessTokenToFrontendInCookieBasedAuth) {
    describe(`with exposeAccessTokenToFrontendInCookieBasedAuth=${exposeAccessTokenToFrontendInCookieBasedAuth}`, () => {
        const sessionConfig = { exposeAccessTokenToFrontendInCookieBasedAuth, getTokenTransferMethod: () => "cookie" };
        describe("createNewSession", () => {
            it("should attach the appropriate tokens", async function () {
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
                    recipeList: [Session.init(sessionConfig)],
                });

                const app = getTestExpressApp();

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
                checkResponse(res, exposeAccessTokenToFrontendInCookieBasedAuth);
            });
        });

        describe("mergeIntoAccessTokenPayload", () => {
            it("should attach the appropriate tokens", async () => {
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
                    recipeList: [Session.init(sessionConfig)],
                });

                const app = getTestExpressApp();

                let createRes = await new Promise((resolve) =>
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
                const info = extractInfoFromResponse(createRes);

                let mergeRes = await new Promise((res, rej) =>
                    request(app)
                        .post("/merge-into-payload")
                        .set("Cookie", `sAccessToken=${info.accessTokenFromAny}`)
                        .type("application/json")
                        .send(
                            JSON.stringify({
                                payload: {
                                    sub: null,
                                    appSub: "asdf",
                                },
                            })
                        )
                        .expect(200)
                        .end((err, resp) => {
                            if (err) {
                                rej(err);
                            } else {
                                res(resp);
                            }
                        })
                );

                checkResponse(mergeRes, exposeAccessTokenToFrontendInCookieBasedAuth);
            });
        });

        describe("verifySession", () => {
            it("should attach the appropriate tokens after refresh", async function () {
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
                    recipeList: [Session.init(sessionConfig)],
                });

                const app = getTestExpressApp();

                let createRes = await new Promise((resolve) =>
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
                const info = extractInfoFromResponse(createRes);
                let refreshRes = await new Promise((resolve, reject) =>
                    request(app)
                        .post("/auth/session/refresh")
                        .set("Cookie", `sRefreshToken=${info.refreshTokenFromAny}`)
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        })
                );
                const refreshInfo = extractInfoFromResponse(refreshRes);

                let res = await new Promise((resolve, reject) =>
                    request(app)
                        .get("/verify")
                        .set("Cookie", `sAccessToken=${refreshInfo.accessTokenFromAny}`)
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        })
                );
                checkResponse(res, exposeAccessTokenToFrontendInCookieBasedAuth);
            });
        });

        describe("refresh session", () => {
            it("should attach the appropriate tokens", async function () {
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
                    recipeList: [Session.init(sessionConfig)],
                });

                const app = getTestExpressApp();

                let createRes = await new Promise((resolve) =>
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
                const info = extractInfoFromResponse(createRes);

                let res = await new Promise((resolve, reject) =>
                    request(app)
                        .post("/auth/session/refresh")
                        .set("Cookie", `sRefreshToken=${info.refreshTokenFromAny}`)
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        })
                );

                checkResponse(res, exposeAccessTokenToFrontendInCookieBasedAuth);
            });
        });
    });
}

function checkResponse(resp, exposeAccessTokenToFrontendInCookieBasedAuth) {
    const info = extractInfoFromResponse(resp);

    if (exposeAccessTokenToFrontendInCookieBasedAuth) {
        assert.strictEqual(info.accessToken, info.accessTokenFromHeader);
    } else {
        assert.notStrictEqual(info.accessToken, undefined);
        assert.strictEqual(info.accessTokenFromHeader, undefined);
    }
}

function getTestExpressApp() {
    const app = express();

    app.use(middleware());
    app.use(json());

    app.post("/create", async (req, res) => {
        try {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId(""),
                req.body.payload,
                {}
            );
            res.status(200).send("");
        } catch (ex) {
            res.status(400).json({ message: ex.message });
        }
    });

    app.get("/verify", verifySession(), async (req, res) => {
        res.status(200).json({ message: true, sessionHandle: req.session.getHandle(), sessionExists: true });
    });

    app.get("/verify-checkdb", verifySession({ checkDatabase: true }), async (req, res) => {
        res.status(200).json({ message: true, sessionHandle: req.session.getHandle(), sessionExists: true });
    });

    app.get("/verify-optional", verifySession({ sessionRequired: false }), async (req, res) => {
        res.status(200).json({
            message: true,
            sessionHandle: req.session && req.session.getHandle(),
            sessionExists: !!req.session,
        });
    });

    app.post("/merge-into-payload", verifySession(), async (req, res) => {
        await req.session.mergeIntoAccessTokenPayload(req.body.payload);
        res.status(200).json({
            message: true,
            sessionHandle: req.session && req.session.getHandle(),
            sessionExists: !!req.session,
            newPayload: await req.session.getAccessTokenPayload(),
        });
    });

    app.get("/revoke-session", verifySession(), async (req, res) => {
        res.status(200).json({ message: await req.session.revokeSession(), sessionHandle: req.session.getHandle() });
    });

    app.use(errorHandler());
    return app;
}
