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
    killAllSTCoresOnly,
    mockResponse,
    mockRequest,
} = require("./utils");
let assert = require("assert");
let { Querier } = require("../lib/build/querier");
const nock = require("nock");
const express = require("express");
const request = require("supertest");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let SessionFunctions = require("../lib/build/recipe/session/sessionFunctions");
let { parseJWTWithoutSignatureVerification } = require("../lib/build/recipe/session/jwt");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
const { maxVersion } = require("../lib/build/utils");
const { fail } = require("assert");
let { middleware, errorHandler } = require("../framework/express");
const { default: RecipeUserId } = require("../lib/build/recipeUserId");

/* TODO:
- the opposite of the above (check that if signing key changes, things are still fine) condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** only for express
*/

describe(`session: ${printPath("[test/session.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check if output headers and set cookies for create session is fine
    it("test that output headers and set cookie for create session is fine", async function () {
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
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
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
        assert(res.header["access-control-expose-headers"] === "front-token, anti-csrf");

        let cookies = extractInfoFromResponse(res);
        assert(cookies.accessToken !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.antiCsrf !== undefined);
        assert(cookies.accessTokenExpiry !== undefined);
        assert(cookies.refreshTokenExpiry !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
        assert(cookies.frontToken !== undefined);

        let frontendInfo = JSON.parse(new Buffer.from(cookies.frontToken, "base64").toString());
        assert.strictEqual(frontendInfo.up["rsub"], "testuserid");
    });

    // check if output headers and set cookies for refresh session is fine
    it("test that output headers and set cookie for refresh session is fine", async function () {
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
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
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
        assert(res2.header["access-control-expose-headers"] === "front-token, anti-csrf");

        let cookies = extractInfoFromResponse(res2);
        assert(cookies.accessToken !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.antiCsrf !== undefined);
        assert(cookies.accessTokenExpiry !== undefined);
        assert(cookies.refreshTokenExpiry !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
        assert(cookies.frontToken !== undefined);

        let frontendInfo = JSON.parse(new Buffer.from(cookies.frontToken, "base64").toString());
        assert.strictEqual(frontendInfo.up["rsub"], "testuserid");
    });

    it("test that session tokens are cleared if refresh token api is called without the refresh token but with access token", async function () {
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
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
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
        let cookies = extractInfoFromResponse(res2);
        assert(res2.status === 401);
        assert(cookies.accessToken === "");
        assert(cookies.accessTokenExpiry === new Date(0).toUTCString());
        assert(cookies.refreshToken === "");
        assert(cookies.refreshTokenExpiry === new Date(0).toUTCString());
    });

    it("test that session tokens are cleared if refresh token api is called without the refresh token but with an expired access token", async function () {
        const connectionURI = await startST({ coreConfig: { access_token_validity: 1 } });
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
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
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

        // Wait for the access token to expire
        await new Promise((resolve) => setTimeout(resolve, 2000));

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
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
        let cookies = extractInfoFromResponse(res2);
        assert(res2.status === 401);
        assert(cookies.accessToken === "");
        assert(cookies.accessTokenExpiry === new Date(0).toUTCString());
        assert(cookies.refreshToken === "");
        assert(cookies.refreshTokenExpiry === new Date(0).toUTCString());
    });

    it("test that access and refresh token for olderCookieDomain is cleared if multiple tokens are passed to the refresh endpoint", async function () {
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
                    olderCookieDomain: ".example.com",
                }),
            ],
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        let res = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sAccessToken=accessToken1",
                    "sAccessToken=accessToken2",
                    "sRefreshToken=refreshToken1",
                    "sRefreshToken=refreshToken2",
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        let cookies = extractInfoFromResponse(res);
        assert(res.status === 200);
        assert(cookies.accessToken === "");
        assert(cookies.accessTokenExpiry === new Date(0).toUTCString());
        assert(cookies.accessTokenDomain === ".example.com");
        assert(cookies.refreshToken === "");
        assert(cookies.refreshTokenExpiry === new Date(0).toUTCString());
        assert(cookies.refreshTokenDomain === ".example.com");
    });

    it("test that refresh endpoint throws a 500 if multiple tokens are passed and olderCookieDomain is undefined", async function () {
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
        app.use(errorHandler());

        let res = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sAccessToken=accessToken1",
                    "sAccessToken=accessToken2",
                    "sRefreshToken=refreshToken1",
                    "sRefreshToken=refreshToken2",
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res.status === 500);
    });

    it("test that verifySession returns 401 if multiple tokens are passed in the request", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res, next) => {
            try {
                let sessionResponse = await Session.getSession(req, res);
                res.status(200).json({ userId: sessionResponse.userId });
            } catch (error) {
                next(error);
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    `sAccessToken=${res.accessToken}`,
                    `sRefreshToken=${res.refreshToken}`,
                    `sAccessToken=${res.accessToken}`,
                    `sRefreshToken=${res.refreshToken}`,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res2.status === 401);
        assert(JSON.parse(res2.text).message === "try refresh token");
    });

    it("test verifySession returns 200 in header based auth even if multiple tokens are present in the cookie", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "header" })],
        });

        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res, next) => {
            try {
                let sessionResponse = await Session.getSession(req, res);
                res.status(200).json({ userId: sessionResponse.userId });
            } catch (error) {
                next(error);
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set({
                    Authorization: `Bearer ${res.accessTokenFromHeader}`,
                })
                .set("Cookie", [`sAccessToken=${res.accessToken}`, `sAccessToken=${res.accessToken}`])
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res2.status === 200);
        assert(JSON.parse(res2.text).userId === "testuserid");
    });

    it("test that refresh endpoint refreshes the token in header based auth even if multiple tokens are present in the cookie", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "header" })],
        });

        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", SuperTokens.convertToRecipeUserId("testuserid"), {}, {});
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set({
                    Authorization: `Bearer ${res.refreshTokenFromHeader}`,
                })
                .set("Cookie", [
                    `sAccessToken=${res.accessToken}`,
                    `sRefreshToken=${res.refreshToken}`,
                    `sAccessToken=${res.accessToken}`,
                    `sRefreshToken=${res.refreshToken}`,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        info = extractInfoFromResponse(res2);
        assert(res2.status === 200);
        assert(info.accessTokenFromHeader !== undefined);
        assert(info.refreshTokenFromHeader !== undefined);
    });

    // check if input cookies are missing, an appropriate error is thrown
    // Failure condition: if valid cookies are set in the refresh call the test will fail
    it("test that if input cookies are missing, an appropriate error is thrown", async function () {
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
        );

        let res2 = await new Promise((resolve) =>
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
        assert(res2.status === 401);
        assert(JSON.parse(res2.text).message === "unauthorised");
    });

    // check if input cookies are there, no error is thrown
    // Failure condition: if cookies are no set in the refresh call the test will fail
    it("test that if input cookies are there, no error is thrown", async function () {
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
        assert(res2.status === 200);
    });

    //- check for token theft detection
    it("token theft detection", async function () {
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

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            {},
            {}
        );

        let response2 = await SessionFunctions.refreshSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            response.refreshToken.token,
            response.antiCsrfToken,
            false,
            true,
            {}
        );

        await SessionFunctions.getSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response2.accessToken.token),
            response2.antiCsrfToken,
            true,
            false,
            {}
        );

        try {
            await SessionFunctions.refreshSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                response.refreshToken.token,
                response.antiCsrfToken,
                false,
                true,
                {}
            );
            throw new Error("should not have come here");
        } catch (err) {
            if (err.type !== Session.Error.TOKEN_THEFT_DETECTED) {
                throw err;
            }
        }
    });

    it("token theft detection with API key", async function () {
        const connectionURI = await startST({ coreConfig: { api_keys: "shfo3h98308hOIHoei309saiho" } });
        SuperTokens.init({
            supertokens: {
                connectionURI,
                apiKey: "shfo3h98308hOIHoei309saiho",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            {},
            {}
        );

        let response2 = await SessionFunctions.refreshSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            response.refreshToken.token,
            response.antiCsrfToken,
            false,
            true,
            {}
        );

        await SessionFunctions.getSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response2.accessToken.token),
            response2.antiCsrfToken,
            true,
            false,
            {}
        );

        try {
            await SessionFunctions.refreshSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                response.refreshToken.token,
                response.antiCsrfToken,
                false,
                true,
                {}
            );
            throw new Error("should not have come here");
        } catch (err) {
            if (err.type !== Session.Error.TOKEN_THEFT_DETECTED) {
                throw err;
            }
        }
    });

    it("query without API key", async function () {
        const connectionURI = await startST({ coreConfig: { api_keys: "shfo3h98308hOIHoei309saiho" } });
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

        try {
            await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
            throw new Error("should not have come here");
        } catch (err) {
            if (
                err.message !==
                "SuperTokens core threw an error for a GET request to path: '/apiversion' with status code: 401 and message: Invalid API key\n"
            ) {
                throw err;
            }
        }
    });

    //check basic usage of session
    it("test basic usage of sessions", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError();

        let response = await SessionFunctions.createNewSession(
            s.recipeInterfaceImpl.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            {},
            {}
        );
        assert.notEqual(response.session, undefined);
        assert.notEqual(response.accessToken, undefined);
        assert.notEqual(response.refreshToken, undefined);
        assert.notEqual(response.antiCsrfToken, undefined);
        assert.strictEqual(Object.keys(response).length, 4);

        await SessionFunctions.getSession(
            s.recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response.accessToken.token),
            response.antiCsrfToken,
            true,
            false,
            {}
        );
        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert.strictEqual(verifyState3, undefined);

        let response2 = await SessionFunctions.refreshSession(
            s.recipeInterfaceImpl.helpers,
            response.refreshToken.token,
            response.antiCsrfToken,
            false,
            true,
            {}
        );
        assert(response2.session !== undefined);
        assert(response2.accessToken !== undefined);
        assert(response2.refreshToken !== undefined);
        assert(response2.antiCsrfToken !== undefined);
        assert(Object.keys(response2).length === 4);

        let response3 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response2.accessToken.token),
            response2.antiCsrfToken,
            true,
            false,
            {}
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(response3.session !== undefined);
        assert(response3.accessToken !== undefined);
        assert(Object.keys(response3).length === 2);

        ProcessState.getInstance().reset();

        let response4 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response3.accessToken.token),
            response2.antiCsrfToken,
            true,
            false,
            {}
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);
        assert(response4.session !== undefined);
        assert(response4.accessToken === undefined);
        assert(Object.keys(response4).length === 1);

        let response5 = await SessionFunctions.revokeSession(
            s.recipeInterfaceImpl.helpers,
            response4.session.handle,
            {}
        );
        assert(response5 === true);
    });

    //check session verify for with / without anti-csrf present
    it("test session verify with anti-csrf present", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError();

        let response = await SessionFunctions.createNewSession(
            s.recipeInterfaceImpl.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            {},
            {}
        );

        let response2 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response.accessToken.token),
            response.antiCsrfToken,
            true,
            true,
            {}
        );
        assert(response2.session != undefined);
        assert.strictEqual(Object.keys(response2.session).length, 6);

        let response3 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response.accessToken.token),
            response.antiCsrfToken,
            false,
            true,
            {}
        );
        assert(response3.session != undefined);
        assert.strictEqual(Object.keys(response3.session).length, 6);
    });

    //check session verify for with / without anti-csrf present**
    it("test session verify without anti-csrf present", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError();

        let response = await SessionFunctions.createNewSession(
            s.recipeInterfaceImpl.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            {},
            {}
        );

        //passing anti-csrf token as undefined and anti-csrf check as false
        let response2 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response.accessToken.token),
            undefined,
            false,
            false,
            {}
        );

        assert.notStrictEqual(response2.session, undefined);
        assert.strictEqual(Object.keys(response2.session).length, 6);

        //passing anti-csrf token as undefined and anti-csrf check as true
        try {
            await SessionFunctions.getSession(
                s.recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(response.accessToken.token),
                undefined,
                true,
                false,
                {}
            );
            throw new Error("should not have come here");
        } catch (err) {
            if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                throw err;
            }
        }
    });

    //check revoking session(s)
    it("test revoking of sessions", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //create a single session and  revoke using the session handle
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId("someUniqueUserId"),
            false,
            {},
            {},
            {}
        );
        let res2 = await SessionFunctions.revokeSession(s.helpers, res.session.handle, {});
        assert(res2 === true);

        let res3 = await SessionFunctions.getAllSessionHandlesForUser(
            s.helpers,
            "someUniqueUserId",
            true,
            undefined,
            undefined,
            {}
        );
        assert(res3.length === 0);

        //create multiple sessions with the same userID and use revokeAllSessionsForUser to revoke sessions
        await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId("someUniqueUserId"),
            false,
            {},
            {},
            {}
        );
        await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId("someUniqueUserId"),
            false,
            {},
            {},
            {}
        );

        let sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(
            s.helpers,
            "someUniqueUserId",
            undefined,
            undefined,
            undefined,
            {}
        );
        assert(sessionIdResponse.length === 2);

        let response = await SessionFunctions.revokeAllSessionsForUser(
            s.helpers,
            "someUniqueUserId",
            undefined,
            undefined,
            undefined,
            {}
        );
        assert(response.length === 2);

        sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(
            s.helpers,
            "someUniqueUserId",
            undefined,
            undefined,
            undefined,
            {}
        );
        assert(sessionIdResponse.length === 0);

        //revoke a session with a session handle that does not exist
        let resp = await SessionFunctions.revokeSession(s.helpers, "", {});
        assert(resp === false);

        //revoke a session with a userId that does not exist
        let resp2 = await SessionFunctions.revokeAllSessionsForUser(
            s.helpers,
            "random",
            undefined,
            undefined,
            undefined,
            {}
        );
        assert(resp2.length === 0);
    });

    //check manipulating session data
    it("test manipulating session data", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s.helpers, "public", new RecipeUserId(""), false, {}, {}, {});
        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value" }, {});

        let res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res2, { key: "value" });

        //changing the value of session data with the same key
        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res3, { key: "value 2" });

        //passing invalid session handle when updating session data
        assert(!(await SessionFunctions.updateSessionDataInDatabase(s.helpers, "random", { key2: "value2" }, {})));
    });

    it("test manipulating session data with new get session function", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s.helpers, "public", new RecipeUserId(""), false, {}, {}, {});
        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value" }, {});

        let res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res2.sessionDataInDatabase, { key: "value" }, {});

        //changing the value of session data with the same key
        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res3.sessionDataInDatabase, { key: "value 2" }, {});

        //passing invalid session handle when updating session data
        assert(!(await SessionFunctions.updateSessionDataInDatabase(s.helpers, "random", { key2: "value2" }, {})));
    });

    it("test null and undefined values passed for session data", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            null,
            {}
        );

        let res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res2, {});

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value" }, {});

        let res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res3, { key: "value" });

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, undefined, {});

        let res4 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res4, {});

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res5 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res5, { key: "value 2" });

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, null, {});

        let res6 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .sessionDataInDatabase;
        assert.deepStrictEqual(res6, {});
    });

    it("test null and undefined values passed for session data with new get session method", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            null,
            {}
        );

        let res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res2.sessionDataInDatabase, {});

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value" }, {});

        let res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res3.sessionDataInDatabase, { key: "value" });

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, undefined, {});

        let res4 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res4.sessionDataInDatabase, {});

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res5 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res5.sessionDataInDatabase, { key: "value 2" });

        await SessionFunctions.updateSessionDataInDatabase(s.helpers, res.session.handle, null, {});

        let res6 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res6.sessionDataInDatabase, {});
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(s.helpers, "public", new RecipeUserId(""), false, {}, {}, {});

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value" }, {});

        let res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res2, { key: "value" });

        //changing the value of jwt payload with the same key
        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res3, { key: "value 2" });

        //passing invalid session handle when updating jwt payload
        assert(!(await SessionFunctions.updateAccessTokenPayload(s.helpers, "random", { key2: "value2" }, {})));
    });

    it("test manipulating jwt payload with new get session method", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(s.helpers, "public", new RecipeUserId(""), false, {}, {}, {});

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value" }, {});

        let res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res2.customClaimsInAccessTokenPayload, { key: "value" });

        //changing the value of jwt payload with the same key
        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res3.customClaimsInAccessTokenPayload, { key: "value 2" });

        //passing invalid session handle when updating jwt payload
        assert(!(await SessionFunctions.updateAccessTokenPayload(s.helpers, "random", { key2: "value2" }, {})));
    });

    it("test null and undefined values passed for jwt payload", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId(""),
            false,
            null,
            {},
            {}
        );

        let res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res2, {});

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value" }, {});

        let res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res3, { key: "value" });

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, undefined, {});

        let res4 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res4, {});

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res5 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res5, { key: "value 2" });

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, null, {});

        let res6 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {}))
            .customClaimsInAccessTokenPayload;
        assert.deepStrictEqual(res6, {});
    });

    it("test null and undefined values passed for jwt payload with new get session method", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId(""),
            false,
            null,
            {},
            {}
        );

        let res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res2.customClaimsInAccessTokenPayload, {});

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value" }, {});

        let res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res3.customClaimsInAccessTokenPayload, { key: "value" });

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, undefined, {});

        let res4 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res4.customClaimsInAccessTokenPayload, {});

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: "value 2" }, {});

        let res5 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res5.customClaimsInAccessTokenPayload, { key: "value 2" });

        await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, null, {});

        let res6 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});
        assert.deepStrictEqual(res6.customClaimsInAccessTokenPayload, {});
    });

    //if anti-csrf is disabled from ST core, check that not having that in input to verify session is fine**
    it("test that when anti-csrf is disabled from ST core not having that in input to verify session is fine", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        s.helpers.config = { antiCsrf: "NONE", useDynamicAccessTokenSigningKey: true };
        let response = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            {},
            {}
        );

        //passing anti-csrf token as undefined and anti-csrf check as false
        let response2 = await SessionFunctions.getSession(
            s.helpers,
            parseJWTWithoutSignatureVerification(response.accessToken.token),
            undefined,
            false,
            true,
            {}
        );
        assert(response2.session != undefined);
        assert.strictEqual(Object.keys(response2.session).length, 6);

        //passing anti-csrf token as undefined and anti-csrf check as true
        let response3 = await SessionFunctions.getSession(
            s.helpers,
            parseJWTWithoutSignatureVerification(response.accessToken.token),
            undefined,
            true,
            true,
            {}
        );
        assert(response3.session != undefined);
        assert.strictEqual(Object.keys(response3.session).length, 6);
    });

    it("test that anti-csrf disabled and sameSite none does not throw an error", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "none", antiCsrf: "NONE" }),
            ],
        });
    });

    it("test that anti-csrf disabled and sameSite lax does now throw an error", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "lax", antiCsrf: "NONE" }),
            ],
        });

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        await SessionFunctions.createNewSession(s.helpers, "public", new RecipeUserId(""), false, {}, {}, {});
    });

    it("test that anti-csrf disabled and sameSite strict does now throw an error", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "strict", antiCsrf: "NONE" }),
            ],
        });

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        await SessionFunctions.createNewSession(s.helpers, "public", new RecipeUserId(""), false, {}, {}, {});
    });

    it("test that custom user id is returned correctly", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId("customuserid"),
            false,
            {},
            null,
            {}
        );

        let res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});

        assert.strictEqual(res2.userId, "customuserid");
    });

    it("test that get session by session handle payload is correct", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId(""),
            false,
            {},
            null,
            {}
        );
        let res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {});

        assert(typeof res2.userId === "string");
        assert(typeof res2.sessionDataInDatabase === "object");
        assert(typeof res2.expiry === "number");
        assert(typeof res2.customClaimsInAccessTokenPayload === "object");
        assert(typeof res2.timeCreated === "number");
        assert.strictEqual(res2.tenantId, "public");
    });

    it("test that revoked session throws error when calling get session by session handle", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(
            s.helpers,
            "public",
            new RecipeUserId("someid"),
            false,
            {},
            null,
            {}
        );

        let response = await SessionFunctions.revokeAllSessionsForUser(
            s.helpers,
            "someid",
            undefined,
            undefined,
            undefined,
            {}
        );
        assert(response.length === 1);

        assert(!(await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, {})));
    });

    it("should use override functions in sessioncontainer methods", async function () {
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
                    override: {
                        functions: (oI) => ({
                            ...oI,
                            getSessionInformation: async (input) => {
                                const info = await oI.getSessionInformation(input);
                                info.sessionDataInDatabase = { test: 1 };
                                return info;
                            },
                        }),
                    },
                }),
            ],
        });

        const session = await Session.createNewSession(
            mockRequest(),
            mockResponse(),
            "public",
            SuperTokens.convertToRecipeUserId("testId")
        );

        const data = await session.getSessionDataFromDatabase();

        assert.equal(data.test, 1);
    });

    it("invalid connectionURI should not cause init to throw", () => {
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:0000",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
    });
});
