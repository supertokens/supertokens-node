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
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyPasswordless = require("../../lib/build/recipe/thirdpartypasswordless");
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
let { middleware, errorHandler } = require("../../framework/express");

describe(`signinupTest: ${printPath("[test/thirdpartypasswordless/signinupFeature.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
        this.customProvider2 = {
            id: "custom",
            get: (recipe, authCode) => {
                throw new Error("error from get function");
            },
        };
        this.customProvider3 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
        this.customProvider4 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        throw new Error("error from getProfileInfo");
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
        this.customProvider5 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: false,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
        this.customProvider6 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        if (authCodeResponse.access_token === undefined) {
                            return {};
                        }
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
    });
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test with thirdPartyPasswordless, that if you disable the signInUp api, it does not work", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: undefined,
                            };
                        },
                    },
                    providers: [
                        ThirdPartyPasswordless.Google({
                            clientId: "test",
                            clientSecret: "test-secret",
                        }),
                    ],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "google",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.status, 404);
    });

    it("test with thirdPartyPasswordless, minimum config without code for thirdparty module", async function () {
        await startST();
        STExpress.init({
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider6],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    authCodeResponse: {
                        access_token: "saodiasjodai",
                    },
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(response1.body.createdNewUser, true);
        assert.strictEqual(response1.body.user.thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.email, "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenFromHeader, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenFromCookie, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.strictEqual(cookies1.idRefreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, undefined);

        assert.strictEqual(await ThirdPartyPasswordless.isEmailVerified(response1.body.user.id), true);

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    authCodeResponse: {
                        access_token: "saodiasjodai",
                    },
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.notStrictEqual(response2, undefined);
        assert.strictEqual(response2.body.status, "OK");
        assert.strictEqual(response2.body.createdNewUser, false);
        assert.strictEqual(response2.body.user.thirdParty.id, "custom");
        assert.strictEqual(response2.body.user.thirdParty.userId, "user");
        assert.strictEqual(response2.body.user.email, "email@test.com");

        let cookies2 = extractInfoFromResponse(response2);
        assert.notStrictEqual(cookies2.accessToken, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.notStrictEqual(cookies2.antiCsrf, undefined);
        assert.notStrictEqual(cookies2.idRefreshTokenFromHeader, undefined);
        assert.notStrictEqual(cookies2.idRefreshTokenFromCookie, undefined);
        assert.notStrictEqual(cookies2.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.idRefreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.strictEqual(cookies2.accessTokenDomain, undefined);
        assert.strictEqual(cookies2.refreshTokenDomain, undefined);
        assert.strictEqual(cookies2.idRefreshTokenDomain, undefined);
        assert.notStrictEqual(cookies2.frontToken, undefined);
    });

    it("test with thirdPartyPasswordless, missing code and authCodeResponse", async function () {
        await startST();
        STExpress.init({
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider6],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.status, 400);
    });

    it("test for thirdPartyPasswordless, minimum config for thirdParty module", async function () {
        await startST();
        STExpress.init({
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(response1.body.createdNewUser, true);
        assert.strictEqual(response1.body.user.thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.email, "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenFromHeader, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenFromCookie, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.strictEqual(cookies1.idRefreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, undefined);

        assert.strictEqual(await ThirdPartyPasswordless.isEmailVerified(response1.body.user.id), true);

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.notStrictEqual(response2, undefined);
        assert.strictEqual(response2.body.status, "OK");
        assert.strictEqual(response2.body.createdNewUser, false);
        assert.strictEqual(response2.body.user.thirdParty.id, "custom");
        assert.strictEqual(response2.body.user.thirdParty.userId, "user");
        assert.strictEqual(response2.body.user.email, "email@test.com");

        let cookies2 = extractInfoFromResponse(response2);
        assert.notStrictEqual(cookies2.accessToken, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.notStrictEqual(cookies2.antiCsrf, undefined);
        assert.notStrictEqual(cookies2.idRefreshTokenFromHeader, undefined);
        assert.notStrictEqual(cookies2.idRefreshTokenFromCookie, undefined);
        assert.notStrictEqual(cookies2.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.idRefreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.strictEqual(cookies2.accessTokenDomain, undefined);
        assert.strictEqual(cookies2.refreshTokenDomain, undefined);
        assert.strictEqual(cookies2.idRefreshTokenDomain, undefined);
        assert.notStrictEqual(cookies2.frontToken, undefined);
    });

    it("test with thirdPartyPasswordless, with minimum config for thirdparty module, email unverified", async function () {
        await startST();
        STExpress.init({
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider5],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(response1.body.createdNewUser, true);
        assert.strictEqual(response1.body.user.thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.email, "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenFromHeader, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenFromCookie, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.idRefreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.strictEqual(cookies1.idRefreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, undefined);

        assert.strictEqual(await ThirdPartyPasswordless.isEmailVerified(response1.body.user.id), false);
    });

    it("test with thirdPartyPasswordless, thirdparty provider doesn't exist in config", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init(),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "google",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 400);
        assert.strictEqual(
            response1.body.message,
            "The third party provider google seems to be missing from the backend configs."
        );
    });

    it("test with thirdPartyPasswordless, provider get function throws error", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init(),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider2],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, request, response, next) => {
            response.status(500).send({
                message: err.message,
            });
        });

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 500);
        assert.deepStrictEqual(response1.body, { message: "error from get function" });
    });

    it("test with thirdPartyPasswordless, email not returned in getProfileInfo function", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init(),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider3],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 200);
        assert.strictEqual(response1.body.status, "NO_EMAIL_GIVEN_BY_PROVIDER");
    });

    it("test with thirdPartyPasswordless, error thrown from getProfileInfo function", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init(),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider4],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, request, response, next) => {
            response.status(500).send({
                message: err.message,
            });
        });

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 200);
        assert.deepStrictEqual(response1.body, { status: "FIELD_ERROR", error: "error from getProfileInfo" });
    });

    it("test with thirdPartyPasswordless, invalid POST params for thirdparty module", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init(),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({})
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 400);
        assert.strictEqual(response1.body.message, "Please provide the thirdPartyId in request body");

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response2.statusCode, 400);
        assert.strictEqual(
            response2.body.message,
            "Please provide one of code or authCodeResponse in the request body"
        );

        let response3 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: false,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response3.statusCode, 400);
        assert.strictEqual(response3.body.message, "Please provide the thirdPartyId in request body");

        let response4 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: 12323,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response4.statusCode, 400);
        assert.strictEqual(response4.body.message, "Please provide the thirdPartyId in request body");

        let response5 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: true,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response5.statusCode, 400);
        assert.strictEqual(response5.body.message, "Please make sure that the code in the request body is a string");

        let response6 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: 32432432,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response6.statusCode, 400);
        assert.strictEqual(response6.body.message, "Please make sure that the code in the request body is a string");

        let response7 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "32432432",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response7.statusCode, 400);
        assert.strictEqual(response7.body.message, "Please provide the redirectURI in request body");

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response8 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "32432432",
                    redirectURI: "http://localhost.org",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response8.statusCode, 200);
    });

    it("test with thirdPartyPasswordless, getUserById when user does not exist", async function () {
        await startST();

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
                Session.init(),
            ],
        });

        assert.strictEqual(await ThirdPartyPasswordless.getUserById("randomID"), undefined);

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "32432432",
                    redirectURI: "http://localhost.org",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.statusCode, 200);

        let signUpUserInfo = response.body.user;
        let userInfo = await ThirdPartyPasswordless.getUserById(signUpUserInfo.id);

        assert.strictEqual(userInfo.email, signUpUserInfo.email);
        assert.strictEqual(userInfo.id, signUpUserInfo.id);
    });

    it("test getUserByThirdPartyInfo when user does not exist", async function () {
        await startST();

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
                Session.init(),
            ],
        });

        assert.strictEqual(await ThirdPartyPasswordless.getUserByThirdPartyInfo("custom", "user"), undefined);

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "32432432",
                    redirectURI: "http://localhost.org",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.statusCode, 200);

        let signUpUserInfo = response.body.user;
        let userInfo = await ThirdPartyPasswordless.getUserByThirdPartyInfo("custom", "user");

        assert.strictEqual(userInfo.email, signUpUserInfo.email);
        assert.strictEqual(userInfo.id, signUpUserInfo.id);
    });
});
