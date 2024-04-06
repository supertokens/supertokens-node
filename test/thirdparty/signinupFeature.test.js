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
    signUPRequest,
    isCDIVersionCompatible,
} = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let ThirdParty = require("../../lib/build/recipe/thirdparty");
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
const EmailVerification = require("../../recipe/emailverification");
let { middleware, errorHandler } = require("../../framework/express");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`signinupTest: ${printPath("[test/thirdparty/signinupFeature.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        return {
                            thirdPartyUserId: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };

        this.customProvider3 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        return {
                            thirdPartyUserId: "user",
                        };
                    },
                };
            },
        };

        this.customProvider4 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        throw new Error("error from getProfileInfo");
                    },
                };
            },
        };

        this.customProvider5 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        return {
                            thirdPartyUserId: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: false,
                            },
                        };
                    },
                };
            },
        };

        this.customProvider6 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function ({ oAuthTokens }) {
                        if (oAuthTokens.access_token === undefined) {
                            return {};
                        }

                        return {
                            thirdPartyUserId: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
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

    it("test with rid thirdpartypasswordless still works", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider6],
                    },
                }),
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "MAGIC_LINK",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .set("rid", "thirdpartypasswordless")
                .send({
                    thirdPartyId: "custom",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, "remove");

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .set("rid", "thirdpartypasswordless")
                .send({
                    thirdPartyId: "custom",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
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
        assert.strictEqual(response2.body.createdNewRecipeUser, false);
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response2.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response2.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response2.body.user.emails[0], "email@test.com");

        let cookies2 = extractInfoFromResponse(response2);
        assert.notStrictEqual(cookies2.accessToken, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.notStrictEqual(cookies2.antiCsrf, undefined);
        assert.notStrictEqual(cookies2.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.strictEqual(cookies2.accessTokenDomain, undefined);
        assert.strictEqual(cookies2.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies2.frontToken, "remove");
    });

    it("test with rid thirdpartyemailpassword still works", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider6],
                    },
                }),
                EmailPassword.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .set("rid", "thirdpartyemailpassword")
                .send({
                    thirdPartyId: "custom",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, "remove");

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .set("rid", "thirdpartyemailpassword")
                .send({
                    thirdPartyId: "custom",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
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
        assert.strictEqual(response2.body.createdNewRecipeUser, false);
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response2.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response2.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response2.body.user.emails[0], "email@test.com");

        let cookies2 = extractInfoFromResponse(response2);
        assert.notStrictEqual(cookies2.accessToken, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.notStrictEqual(cookies2.antiCsrf, undefined);
        assert.notStrictEqual(cookies2.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.strictEqual(cookies2.accessTokenDomain, undefined);
        assert.strictEqual(cookies2.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies2.frontToken, "remove");
    });

    it("test that disable api, the default signinup API does not work", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdParty.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: undefined,
                            };
                        },
                    },
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId: "test",
                                            clientSecret: "test-secret",
                                        },
                                    ],
                                },
                            },
                        ],
                    },
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
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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

    it("test minimum config without code for thirdparty module", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider6],
                    },
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
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, "remove");

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
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
        assert.strictEqual(response2.body.createdNewRecipeUser, false);
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response2.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response2.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response2.body.user.emails[0], "email@test.com");

        let cookies2 = extractInfoFromResponse(response2);
        assert.notStrictEqual(cookies2.accessToken, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.notStrictEqual(cookies2.antiCsrf, undefined);
        assert.notStrictEqual(cookies2.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.strictEqual(cookies2.accessTokenDomain, undefined);
        assert.strictEqual(cookies2.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies2.frontToken, "remove");
    });

    it("test missing redirectURIInfo and oAuthTokens", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider6],
                    },
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

    it("test minimum config for thirdparty module", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
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
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, "remove");
        assert.strictEqual(
            await EmailVerification.isEmailVerified(
                STExpress.convertToRecipeUserId(response1.body.user.id),
                response1.body.user.email
            ),
            true
        );

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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
        assert.strictEqual(response2.body.createdNewRecipeUser, false);
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response2.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response2.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response2.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response2.body.user.emails[0], "email@test.com");

        let cookies2 = extractInfoFromResponse(response2);
        assert.notStrictEqual(cookies2.accessToken, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.notStrictEqual(cookies2.antiCsrf, undefined);
        assert.notStrictEqual(cookies2.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies2.refreshToken, undefined);
        assert.strictEqual(cookies2.accessTokenDomain, undefined);
        assert.strictEqual(cookies2.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies2.frontToken, "remove");
    });

    it("test minimum config for thirdparty module, email unverified", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider5],
                    },
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
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.loginMethods[0].thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        let cookies1 = extractInfoFromResponse(response1);
        assert.notStrictEqual(cookies1.accessToken, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.notStrictEqual(cookies1.antiCsrf, undefined);
        assert.notStrictEqual(cookies1.accessTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshTokenExpiry, undefined);
        assert.notStrictEqual(cookies1.refreshToken, undefined);
        assert.strictEqual(cookies1.accessTokenDomain, undefined);
        assert.strictEqual(cookies1.refreshTokenDomain, undefined);
        assert.notStrictEqual(cookies1.frontToken, "remove");

        assert.strictEqual(
            await EmailVerification.isEmailVerified(
                STExpress.convertToRecipeUserId(response1.body.user.id),
                response1.body.user.email
            ),
            false
        );
    });

    it("test thirdparty provider doesn't exist", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
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
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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
        assert.strictEqual(response1.body.message, "the provider google could not be found in the configuration");
    });

    it("test email not returned in getProfileInfo function", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider3],
                    },
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
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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

    it("test error thrown from getProfileInfo function", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider4],
                    },
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
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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
        assert.deepStrictEqual(response1.body, { message: "error from getProfileInfo" });
    });

    it("test invalid POST params for thirdparty module", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
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
            "Please provide one of redirectURIInfo or oAuthTokens in the request body"
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

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response8 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://localhost.org",
                        redirectURIQueryParams: {
                            code: "32432432",
                        },
                    },
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

    it("test handlePostSignUpIn gets set correctly", async function () {
        const connectionURI = await startST();

        process.env.userId = "";
        process.env.loginType = "";

        assert.strictEqual(process.env.userId, "");
        assert.strictEqual(process.env.loginType, "");

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: async (input) => {
                                    let response = await oI.signInUpPOST(input);
                                    if (response.status === "OK") {
                                        process.env.userId = response.user.id;
                                        process.env.loginType = "thirdparty";
                                    }
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

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").times(2).reply(200, {});

        let response1 = await request(app)
            .post("/auth/signinup")
            .send({
                thirdPartyId: "custom",
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                    redirectURIQueryParams: {
                        code: "abcdefghj",
                    },
                },
            });

        assert.strictEqual(process.env.userId, response1.body.user.id);
        assert.strictEqual(process.env.loginType, "thirdparty");
    });

    it("test minimum config with one provider", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").times(1).reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.thirdParty[0].id, "custom");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "user");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        assert.strictEqual(
            await EmailVerification.isEmailVerified(
                STExpress.convertToRecipeUserId(response1.body.user.id),
                response1.body.user.email
            ),
            true
        );
    });

    it("test getUserCount and pagination works fine", async function () {
        const connectionURI = await startST();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdParty.init(),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(currCDIVersion, "2.7") === "2.7") {
            // we don't run the tests below for older versions of the core since it
            // was introduced in >= 2.8 CDI
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        assert((await STExpress.getUserCount()) === 0);

        await signUPRequest(app, "random@gmail.com", "validpass123");

        assert((await STExpress.getUserCount()) === 1);
        assert((await STExpress.getUserCount(["emailpassword"])) === 1);
        assert((await STExpress.getUserCount(["emailpassword", "thirdparty"])) === 1);

        await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "randomUserId", "test@example.com", false);

        assert((await STExpress.getUserCount()) === 2);
        assert((await STExpress.getUserCount(["emailpassword"])) === 1);
        assert((await STExpress.getUserCount(["thirdparty"])) === 1);
        assert((await STExpress.getUserCount(["emailpassword", "thirdparty"])) === 2);

        await signUPRequest(app, "random1@gmail.com", "validpass123");

        let usersOldest = await STExpress.getUsersOldestFirst({ tenantId: "public" });
        assert(usersOldest.nextPaginationToken === undefined);
        assert(usersOldest.users.length === 3);
        assert(usersOldest.users[0].loginMethods[0].recipeId === "emailpassword");
        assert(usersOldest.users[0].emails[0] === "random@gmail.com");

        let usersNewest = await STExpress.getUsersNewestFirst({
            tenantId: "public",
            limit: 2,
        });
        assert(usersNewest.nextPaginationToken !== undefined);
        assert(usersNewest.users.length === 2);
        assert(usersNewest.users[0].loginMethods[0].recipeId === "emailpassword");
        assert(usersNewest.users[0].emails[0] === "random1@gmail.com");

        let usersNewest2 = await STExpress.getUsersNewestFirst({
            tenantId: "public",
            paginationToken: usersNewest.nextPaginationToken,
        });
        assert(usersNewest2.nextPaginationToken === undefined);
        assert(usersNewest2.users.length === 1);
        assert(usersNewest2.users[0].loginMethods[0].recipeId === "emailpassword");
        assert(usersNewest2.users[0].emails[0] === "random@gmail.com");
    });

    it("getUserById when user does not exist", async function () {
        const connectionURI = await startST();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        assert.strictEqual(await STExpress.getUser("randomID"), undefined);

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://localhost.org",
                        redirectURIQueryParams: {
                            code: "32432432",
                        },
                    },
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
        let userInfo = await STExpress.getUser(signUpUserInfo.id);

        assert.strictEqual(userInfo.emails[0], signUpUserInfo.emails[0]);
        assert.strictEqual(userInfo.id, signUpUserInfo.id);
    });

    it("test getUserByThirdPartyInfo when user does not exist", async function () {
        const connectionURI = await startST();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        assert.strictEqual(
            (
                await STExpress.listUsersByAccountInfo("public", {
                    thirdParty: { id: "custom", userId: "user" },
                })
            ).length,
            0
        );

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://localhost.org",
                        redirectURIQueryParams: {
                            code: "32432432",
                        },
                    },
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
        let userInfo = await STExpress.listUsersByAccountInfo("public", {
            thirdParty: { id: "custom", userId: "user" },
        });

        assert.strictEqual(userInfo[0].emails[0], signUpUserInfo.emails[0]);
        assert.strictEqual(userInfo[0].id, signUpUserInfo.id);
    });
});
