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
    resetAll,
    extractInfoFromResponse,
} = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let nock = require("nock");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/thirdpartyapis.test.js]")}`, function () {
    before(function () {
        this.customProviderWithEmailVerified = {
            config: {
                thirdPartyId: "custom-ev",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [
                    {
                        clientId: "supertokens",
                        clientSecret: "",
                    },
                ],
            },
            override: (oI) => ({
                ...oI,
                exchangeAuthCodeForOAuthTokens: () => ({}),
                getUserInfo: () => {
                    return {
                        id: "user",
                        email: {
                            id: "email@test.com",
                            isVerified: true,
                        },
                    };
                },
            }),
        };
        this.customProviderWithEmailNotVerified = {
            config: {
                thirdPartyId: "custom-no-ev",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [
                    {
                        clientId: "supertokens",
                        clientSecret: "",
                    },
                ],
            },
            override: (oI) => ({
                ...oI,
                exchangeAuthCodeForOAuthTokens: () => ({}),
                getUserInfo: () => {
                    return {
                        id: "user",
                        email: {
                            id: "email@test.com",
                            isVerified: false,
                        },
                    };
                },
            }),
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

    describe("signInUpPOST tests", function () {
        it("signInUpPOST calls isSignUpAllowed if it's sign up even if user with email already exists with third party.", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "email@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) !== undefined
            );
        });

        it("signInUpPOST does not call isSignUpAllowed if it's a sign in even if user's email has changed", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-ev", "user", "email2@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) === undefined
            );
        });

        it("signInUpPOST returns EMAIL_ALREADY_USED_IN_ANOTHER_ACCOUNT if isSignUpAllowed returns false", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "email@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "EMAIL_ALREADY_USED_IN_ANOTHER_ACCOUNT");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) !== undefined
            );
        });

        it("signInUpPOST successfully links account and returns the session of the right recipe user if it's a sign up", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "email@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) !== undefined
            );
            assert(response.body.createdNewUser === true);

            let pUser = await supertokens.getUser(tpUser.id);
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods.length === 2);
            assert(pUser.loginMethods[1].thirdParty.id === "custom-ev");
            assert(pUser.loginMethods[0].thirdParty.id === "google");

            // checking session
            tokens = extractInfoFromResponse(response);
            let session = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            assert(session.getUserId() === tpUser.id);
            assert(session.getRecipeUserId().getAsString() === pUser.loginMethods[1].recipeUserId.getAsString());
        });

        it("signInUpPOST successfully does linking of accounts and returns the session of the right recipe user if it's a sign in", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "email@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-ev", "user", "email@test.com", true, {
                    doNotLink: true,
                })
            ).user;
            assert(tpUser2.isPrimaryUser === false);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) === undefined
            );
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED)) !== undefined
            );
            assert(response.body.createdNewUser === false);

            let pUser = await supertokens.getUser(tpUser.id);
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods.length === 2);
            assert(pUser.loginMethods[0].thirdParty.id === "google");
            assert(pUser.loginMethods[1].thirdParty.id === "custom-ev");

            // checking session
            tokens = extractInfoFromResponse(response);
            let session = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            assert(session.getUserId() === tpUser.id);
            assert(session.getRecipeUserId().getAsString() === tpUser2.loginMethods[0].recipeUserId.getAsString());
        });

        it("signInUpPOST gives the right user in the override on successful account linking", async function () {
            await startST();
            let userInCallback = undefined;
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    signInUpPOST: async function (input) {
                                        let response = await oI.signInUpPOST(input);
                                        if (response.status === "OK") {
                                            userInCallback = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "email@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");

            let pUser = await supertokens.getUser(tpUser.id);
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods.length === 2);
            assert(pUser.loginMethods[1].thirdParty.id === "custom-ev");
            assert(pUser.loginMethods[0].thirdParty.id === "google");

            assert(userInCallback !== undefined);
            assert.equal(JSON.stringify(pUser), JSON.stringify(userInCallback));
        });

        it("signInUpPOST returns SIGN_IN_NOT_ALLOWED if the sign in user's email has changed to another primary user's email", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-ev", "user", "email2@test.com", true)
            ).user;
            await AccountLinking.createPrimaryUser(tpUser.user.loginMethods[0].recipeUserId);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", true)
            ).user;
            assert(tpUser2.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(
                response.body.reason ===
                    "Cannot sign in / up because new email cannot be applied to existing account. Please contact support."
            );
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) === undefined
            );
        });

        it("signInUpPOST returns SIGN_IN_UP_NOT_ALLOWED if it's a sign in and isEmailChangeAllowed returns false", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-no-ev", "user", "email2@test.com", false)
            ).user;
            assert(tpUser.isPrimaryUser === false);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", true)
            ).user;
            assert(tpUser2.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(
                response.body.reason ===
                    "Cannot sign in / up because new email cannot be applied to existing account. Please contact support."
            );
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) === undefined
            );
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED)) === undefined
            );
        });

        it("signInUpPOST checks verification from email verification recipe before calling  isEmailChangeAllowed", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-no-ev", "user", "email2@test.com", true, {
                    doNotLink: true,
                })
            ).user;
            assert(tpUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                tpUser.loginMethods[0].recipeUserId,
                "email@test.com"
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", true)
            ).user;
            assert(tpUser2.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");

            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED)) !== undefined
            );
        });

        it("signInUpPOST returns SIGN_IN_UP_NOT_ALLOWED if it's a sign in and isSignInAllowed returns false cause there is no email change", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-no-ev", "user", "email@test.com", false)
            ).user;
            assert(tpUser.isPrimaryUser === false);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", true)
            ).user;
            assert(tpUser2.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(response.body.reason === "Cannot sign in / up due to security reasons. Please contact support.");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED)) !== undefined
            );
        });

        it("signInUpPOST does account linking during sign in if required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-no-ev", "user", "email@test.com", true, {
                    doNotLink: true,
                })
            ).user;
            assert(tpUser.isPrimaryUser === false);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", true)
            ).user;
            assert(tpUser2.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "OK");
            assert(response.body.createdNewUser === false);
            assert(response.body.user.id === tpUser2.id);
            assert(response.body.user.loginMethods.length === 2);

            tokens = extractInfoFromResponse(response);
            let session = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            assert(session.getUserId() === tpUser2.id);
            assert(session.getRecipeUserId().getAsString() === tpUser.id);
        });

        it("signInUpPOST returns SIGN_IN_UP_NOT_ALLOWED even though isEmailChangeAllowed returns true if other recipe exist with unverified, same email", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-no-ev", "user", "email2@test.com", false)
            ).user;
            assert(tpUser.isPrimaryUser === false);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", false)
            ).user;
            assert(tpUser2.isPrimaryUser === false);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(response.body.reason === "Cannot sign in / up due to security reasons. Please contact support.");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED)) !== undefined
            );
        });

        it("signInUpPOST returns SIGN_IN_UP_NOT_ALLOWED even though isEmailChangeAllowed returns true if primary user exists with same email, new email is verified for recipe user, but not for primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailNotVerified,

                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "custom-no-ev", "user", "email2@test.com", false)
            ).user;
            assert(tpUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                tpUser.loginMethods[0].recipeUserId,
                "email@test.com"
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let tpUser2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "user", "email@test.com", false)
            ).user;
            assert(tpUser2.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(tpUser2.loginMethods[0].recipeUserId);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-no-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(response.body.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(response.body.reason === "Cannot sign in / up due to security reasons. Please contact support.");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED)) !== undefined
            );
        });
    });
});
