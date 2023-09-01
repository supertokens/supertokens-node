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
const { printPath, setupST, startST, killAllST, cleanST, signUPRequest } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPasswordRecipe = require("../../lib/build/recipe/thirdpartyemailpassword/recipe").default;
let ThirdPartyEmailPassword = require("../../lib/build/recipe/thirdpartyemailpassword");
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
const EmailVerification = require("../../recipe/emailverification");
let { Querier } = require("../../lib/build/querier");
let { maxVersion } = require("../../lib/build/utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`signupTest: ${printPath("[test/thirdpartyemailpassword/signupFeature.test.js]")}`, function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: undefined,
                            };
                        },
                    },
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

    it("test that if disable api, the default signup API does not work", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignUpPOST: undefined,
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 404);
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
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

    it("test signUpAPI works when input is fine", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert(userInfo.emails[0] === "random@gmail.com");
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: async (input) => {
                                    let response = await oI.thirdPartySignInUpPOST(input);
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

        assert.strictEqual(process.env.userId, response1.body.user.id);
        assert.strictEqual(process.env.loginType, "thirdparty");
    });

    it("test handlePostSignUp gets set correctly", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignUpPOST: async (input) => {
                                    let response = await oI.emailPasswordSignUpPOST(input);
                                    if (response.status === "OK") {
                                        process.env.userId = response.user.id;
                                        process.env.loginType = "emailpassword";
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert.strictEqual(process.env.userId, userInfo.id);
        assert.strictEqual(process.env.loginType, "emailpassword");
    });

    // will test that the error is correctly propagated to the required sub-recipe
    it("test signUpAPI throws an error in case of a duplicate email (emailpassword)", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert(userInfo.emails[0] === "random@gmail.com");

        response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 200);
        let responseInfo = JSON.parse(response.text);

        assert(responseInfo.status === "FIELD_ERROR");
        assert(responseInfo.formFields.length === 1);
        assert(responseInfo.formFields[0].id === "email");
        assert(responseInfo.formFields[0].error === "This email already exists. Please sign in instead.");
    });

    // NO_EMAIL_GIVEN_BY_PROVIDER thrown from sub recipe
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
                ThirdPartyEmailPassword.init({
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
                ThirdPartyEmailPassword.init({
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
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

        await ThirdPartyEmailPassword.thirdPartyManuallyCreateOrUpdateUser(
            "public",
            "google",
            "randomUserId",
            "test@example.com",
            false
        );

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

    it("updateEmailOrPassword function test for third party login", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                            },
                            {
                                id: "password",
                                validate: async (value) => {
                                    if (value.length < 5) return "Password should be greater than 5 characters";
                                    return undefined;
                                },
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let thirdPartyRecipe = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();

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

        {
            let response = await new Promise((resolve) =>
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
            assert.strictEqual(response.statusCode, 200);

            let signUpUserInfo = response.body.user;
            let userInfo = await STExpress.listUsersByAccountInfo("public", {
                thirdParty: { id: "custom", userId: "user" },
            });

            assert.strictEqual(userInfo[0].emails[0], signUpUserInfo.emails[0]);
            assert.strictEqual(userInfo[0].id, signUpUserInfo.id);

            try {
                await ThirdPartyEmailPassword.updateEmailOrPassword({
                    recipeUserId: STExpress.convertToRecipeUserId(userInfo[0].id),
                    email: "test2@example.com",
                });
                throw new Error("test failed");
            } catch (err) {
                if (
                    err.message !== "Cannot update email or password of a user who signed up using third party login."
                ) {
                    throw err;
                }
            }
        }

        {
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "pass@123",
                            },
                        ],
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
            let r = await ThirdPartyEmailPassword.updateEmailOrPassword({
                recipeUserId: STExpress.convertToRecipeUserId(signUpUserInfo.id),
                email: "test2@example.com",
                password: "haha@1234",
            });

            assert(r.status === "OK");
            let r2 = await ThirdPartyEmailPassword.updateEmailOrPassword({
                recipeUserId: STExpress.convertToRecipeUserId(signUpUserInfo.id + "123"),
                email: "test2@example.com",
            });

            assert(r2.status === "UNKNOWN_USER_ID_ERROR");
            let r3 = await ThirdPartyEmailPassword.updateEmailOrPassword({
                recipeUserId: STExpress.convertToRecipeUserId(signUpUserInfo.id),
                email: "test2@example.com",
                password: "test",
            });

            assert(r3.status === "PASSWORD_POLICY_VIOLATED_ERROR");
            assert(r3.failureReason === "Password should be greater than 5 characters");
        }
    });
});
