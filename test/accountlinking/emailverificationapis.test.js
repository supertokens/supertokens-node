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
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
let EmailVerificationRecipe = require("../../lib/build/recipe/emailverification/recipe").default;
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");
let fs = require("fs");
let path = require("path");

describe(`emailverificationapiTests: ${printPath("[test/accountlinking/emailverificationapi.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("updateSessionIfRequiredPostEmailVerification tests", function () {
        it("updateSessionIfRequiredPostEmailVerification throws unauthorised error in case user does not exist and session exists", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = (await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId))
                .token;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            await supertokens.deleteUser(epUser.id);

            try {
                await EmailVerificationRecipe.getInstance().updateSessionIfRequiredPostEmailVerification({
                    req: undefined,
                    res: undefined,
                    session,
                    recipeUserIdWhoseEmailGotVerified: epUser.loginMethods[0].recipeUserId,
                });
                assert(false);
            } catch (err) {
                assert(err.type === "UNAUTHORISED");
            }
        });

        it("updateSessionIfRequiredPostEmailVerification does not throws unauthorised error in case user does not exist and session does not exists", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = (await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId))
                .token;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            await supertokens.deleteUser(epUser.id);

            let res = await EmailVerificationRecipe.getInstance().updateSessionIfRequiredPostEmailVerification({
                req: undefined,
                res: undefined,
                session: undefined,
                recipeUserIdWhoseEmailGotVerified: epUser.loginMethods[0].recipeUserId,
            });
            assert(res === undefined);
        });

        it("updateSessionIfRequiredPostEmailVerification sets the right claim in the session post verification of the current logged in user, if it did not get linked to another user ", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = (await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId))
                .token;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let payloadBefore = session.getAccessTokenPayload();
            assert(payloadBefore["st-ev"]["v"] === false);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        method: "token",
                        token,
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
            assert(response !== undefined);
            let tokens = extractInfoFromResponse(response);
            let accessToken = tokens.accessTokenFromAny;

            let sessionAfter = await Session.getSessionWithoutRequestResponse(accessToken);
            let payloadAfter = sessionAfter.getAccessTokenPayload();
            assert(payloadAfter["st-ev"]["v"] === true);
            assert(payloadAfter["sub"] === payloadBefore["sub"]);
        });

        it("updateSessionIfRequiredPostEmailVerification creates a new session if the user is linked to another user", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = (await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId))
                .token;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let payloadBefore = session.getAccessTokenPayload();
            assert(payloadBefore["st-ev"]["v"] === false);

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com", false);
            assert(tpUser.user.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));
            await AccountLinking.linkAccounts(epUser.loginMethods[0].recipeUserId, tpUser.user.id);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        method: "token",
                        token,
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
            assert(response !== undefined);
            let tokens = extractInfoFromResponse(response);
            let accessToken = tokens.accessTokenFromHeader;

            let sessionAfter = await Session.getSessionWithoutRequestResponse(accessToken);
            let payloadAfter = sessionAfter.getAccessTokenPayload();
            assert(payloadAfter["st-ev"]["v"] === true);
            assert(sessionAfter.getUserId() === tpUser.user.id);
            assert(sessionAfter.getRecipeUserId().getAsString() === epUser.id);

            // check that old session is revoked
            let sessionInformation = await Session.getSessionInformation(session.getHandle());
            assert(sessionInformation === undefined);
        });

        it("updateSessionIfRequiredPostEmailVerification does nothing to the session post verification if linking another account to the current session", async function () {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            {
                let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
                await EmailVerification.verifyEmailUsingToken(token.token);
            }

            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let payloadBefore = session.getAccessTokenPayload();
            assert(payloadBefore["st-ev"]["v"] === true);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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
            assert(res !== undefined);
            assert(res.body.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
            assert(res.body.primaryUserId === epUser.id);
            let newEpUser = await supertokens.listUsersByAccountInfo({
                email: "test2@example.com",
            });
            assert(res.body.recipeUserId === newEpUser[0].id);
            assert(res.body.email === "test2@example.com");

            let newUser = await supertokens.getUser(res.body.recipeUserId);
            assert(newUser.emails[0] === "test2@example.com");
            assert(newUser.emails.length === 1);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);

            let token = (
                await EmailVerification.createEmailVerificationToken(
                    supertokens.convertToRecipeUserId(res.body.recipeUserId)
                )
            ).token;

            let response2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        method: "token",
                        token,
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

            let tokens = extractInfoFromResponse(response2);
            assert(tokens.accessTokenFromAny === undefined);

            pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 2);
        });

        it("updateSessionIfRequiredPostEmailVerification works fine if session does not exist for user", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = (await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId))
                .token;

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .send({
                        method: "token",
                        token,
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
            assert(response !== undefined);
            assert(response.body.status === "OK");
            let isVerified = await EmailVerification.isEmailVerified(epUser.loginMethods[0].recipeUserId);
            assert(isVerified === true);
            let tokens = extractInfoFromResponse(response);
            let accessToken = tokens.accessTokenFromAny;
            assert(accessToken === undefined);
        });
    });

    describe("isEmailVerifiedGET tests", function () {
        it("calling isEmailVerifiedGET  gives false for currently logged in user if email is not verified, and does not update session", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === false);

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);
            assert(tokens.accessTokenFromHeader === undefined);
        });

        it("calling isEmailVerifiedGET gives true for currently logged in user if email is verified, and does not update session", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === true);

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);
            assert(tokens.accessTokenFromHeader === undefined);
        });

        it("calling isEmailVerifiedGET gives false for currently logged in user if email is not verified, and updates session if needed", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            await EmailVerification.unverifyEmail(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === false);

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let claimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(claimValue === false);
        });

        it("calling isEmailVerifiedGET gives true for currently logged in user if email is verified, and updates session if needed", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === true);

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let claimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(claimValue === true);
        });

        it("calling isEmailVerifiedGET with post login account linking gives true for logged in user even if to link user is false, and does not update session", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let t = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(t.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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

            let tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === true);

            tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);
            assert(tokens.accessTokenFromHeader === undefined);
        });

        it("calling isEmailVerifiedGET with account linking post login gives false for logged in user, even if to link user if email is verified, and updates session", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let t = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(t.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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

            let tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            // we unverify the session recipe's email just cause to make it mismatch from the
            // to link account's email
            await EmailVerification.unverifyEmail(epUser.loginMethods[0].recipeUserId);

            assert(res.body.email === "test2@example.com");
            let toLinkUserId = res.body.recipeUserId;
            let t2 = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(toLinkUserId)
            );
            await EmailVerification.verifyEmailUsingToken(t2.token, {
                doNotLink: true,
            });

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === false);

            tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let evClaimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(evClaimValue === false);
        });

        it("calling isEmailVerifiedGET with post login account linking has no effect on the session if already linked and gives verification status of main session's recipe user id", async function () {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let t = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(t.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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

            let tokens = extractInfoFromResponse(res);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            // we unverify the session recipe's email just cause to make it mismatch from the
            // to link account's email
            await EmailVerification.unverifyEmail(epUser.loginMethods[0].recipeUserId);

            let toLinkUserId = res.body.recipeUserId;
            let t2 = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(toLinkUserId)
            );
            await EmailVerification.verifyEmailUsingToken(t2.token);

            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === false);

            tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let evClaimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(evClaimValue === false);
        });
    });

    describe("generateEmailVerifyTokenPOST tests", function () {
        it("calling generateEmailVerifyTokenPOST generates for currently logged in user if email is not verified, and does not update session", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);
            assert(tokens.accessTokenFromHeader === undefined);

            assert(userInCallback.id === epUser.id);
            assert(userInCallback.email === "test@example.com");
            assert(userInCallback.recipeUserId.getAsString() === epUser.loginMethods[0].recipeUserId.getAsString());
        });

        it("calling generateEmailVerifyTokenPOST gives already verified for currently logged in user if email is verified, and does not update session", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "EMAIL_ALREADY_VERIFIED_ERROR");

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);
            assert(tokens.accessTokenFromHeader === undefined);

            assert(userInCallback === undefined);
        });

        it("calling generateEmailVerifyTokenPOST sends email for currently logged in user if email is not verified, and updates session if needed", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            await EmailVerification.unverifyEmail(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let claimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(claimValue === false);

            assert(userInCallback.id === epUser.id);
            assert(userInCallback.email === "test@example.com");
            assert(userInCallback.recipeUserId.getAsString() === epUser.loginMethods[0].recipeUserId.getAsString());
        });

        it("calling generateEmailVerifyTokenPOST gives email already verified for currently logged in user if email is verified, and updates session if needed", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let token = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "EMAIL_ALREADY_VERIFIED_ERROR");

            let tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let claimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(claimValue === true);

            assert(userInCallback === undefined);
        });

        it("calling generateEmailVerifyTokenPOST with post login account linking returns email already verified for logged in user even if new account is not verified", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let t = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(t.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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

            let tokens = extractInfoFromResponse(res);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            let toLinkUser = res.body.recipeUserId;

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "EMAIL_ALREADY_VERIFIED_ERROR");

            tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);
            assert(tokens.accessTokenFromHeader === undefined);
        });

        it("calling generateEmailVerifyTokenPOST with post login account linking sends email verification email for logged in user even if to link account is verified, and modifies session.", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let t = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(t.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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

            let tokens = extractInfoFromResponse(res);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            // we unverify the session recipe's email just cause to make it mismatch from the
            // to link account's email
            await EmailVerification.unverifyEmail(epUser.loginMethods[0].recipeUserId);

            let toLinkUserId = res.body.recipeUserId;
            let t2 = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(toLinkUserId)
            );
            await EmailVerification.verifyEmailUsingToken(t2.token, {
                doNotLink: true,
            });

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");

            tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken !== undefined);
            assert(tokens.accessTokenFromAny !== undefined);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let evClaimValue = await newSession.getClaimValue(EmailVerification.EmailVerificationClaim);
            assert(evClaimValue === false);

            assert(userInCallback.id === epUser.id);
            assert(userInCallback.email === "test@example.com");
            assert(userInCallback.recipeUserId.getAsString() === epUser.loginMethods[0].recipeUserId.getAsString());
        });

        it("calling generateEmailVerifyTokenPOST with post login account linking has no effect on session if accounts already linked.", async function () {
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
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async (input) => {
                                        userInCallback = input.user;
                                    },
                                };
                            },
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let t = await EmailVerification.createEmailVerificationToken(epUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(t.token);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
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

            userInCallback = undefined; // we do this cause the above API sends an email verification email.

            let tokens = extractInfoFromResponse(res);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            let toLinkUserId = res.body.recipeUserId;
            let t2 = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(toLinkUserId)
            );
            await EmailVerification.verifyEmailUsingToken(t2.token);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "EMAIL_ALREADY_VERIFIED_ERROR");

            tokens = extractInfoFromResponse(response);
            assert(tokens.accessToken === undefined);
            assert(tokens.accessTokenFromAny === undefined);

            assert(userInCallback === undefined);
        });
    });

    describe("getEmailForRecipeUserId tests", function () {
        it("calling getEmailForRecipeUserId returns email provided from the config", async function () {
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
                        getEmailForRecipeUserId: async function (recipeUserId) {
                            return {
                                status: "OK",
                                email: "random@example.com",
                            };
                        },
                    }),
                    Session.init(),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = await EmailPassword.signUp("random2@example.com", "password1234");

            let token = await EmailVerification.createEmailVerificationToken(epUser.user.loginMethods[0].recipeUserId);

            let user = (await EmailVerification.getEmailVerificationTokenInfo(token.token)).user;

            assert(user.email === "random@example.com");
        });

        it("calling getEmailForRecipeUserId falls back on default method of getting email if UNKNOWN_USER_ID_ERROR is returned", async function () {
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
                        getEmailForRecipeUserId: async function (recipeUserId) {
                            return {
                                status: "UNKNOWN_USER_ID_ERROR",
                            };
                        },
                    }),
                    Session.init(),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = await EmailPassword.signUp("random@example.com", "password1234");

            let token = await EmailVerification.createEmailVerificationToken(epUser.user.loginMethods[0].recipeUserId);

            let user = (await EmailVerification.getEmailVerificationTokenInfo(token.token)).user;
            assert(user.email === "random@example.com");
        });

        it("calling getEmailForRecipeUserId with recipe user id that has many other linked recipe user ids returns the right email", async function () {
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
                        getEmailForRecipeUserId: async function (recipeUserId) {
                            return {
                                status: "UNKNOWN_USER_ID_ERROR",
                            };
                        },
                    }),
                    Session.init(),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

            let epUser = await EmailPassword.signUp("random@example.com", "password1234");
            await AccountLinking.createPrimaryUser(epUser.user.loginMethods[0].recipeUserId);

            let epUser2 = await EmailPassword.signUp("random2@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser2.user.loginMethods[0].recipeUserId, epUser.user.id);

            let pUser = await supertokens.getUser(epUser.user.id);
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods.length === 2);
            assert(pUser.id === epUser.user.id);

            let token = await EmailVerification.createEmailVerificationToken(epUser2.user.loginMethods[0].recipeUserId);

            let user = (await EmailVerification.getEmailVerificationTokenInfo(token.token)).user;
            assert(user.email === "random2@example.com");
        });
    });

    it("email verification recipe uses getUser function only in getEmailForRecipeUserId", async function () {
        // search through all files in directory for a string
        let files = await new Promise((resolve, reject) => {
            recursive("./lib/ts/recipe/emailverification", (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(files);
            });
        });
        let getUserCount = 0;
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let content = fs.readFileSync(file).toString();
            let count = content.split("getUser(").length - 1;
            getUserCount += count;
        }
        assert(getUserCount === 2);

        let listUsersCount = 0;
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let content = fs.readFileSync(file).toString();
            let count = content.split("listUsersByAccountInfo(").length - 1;
            listUsersCount += count;
        }
        assert(listUsersCount === 0);

        // define recursive function used above
        function recursive(dir, done) {
            let results = [];
            fs.readdir(dir, function (err, list) {
                if (err) return done(err);
                let pending = list.length;
                if (!pending) return done(null, results);
                list.forEach(function (file) {
                    file = path.resolve(dir, file);
                    fs.stat(file, function (err, stat) {
                        if (stat && stat.isDirectory()) {
                            recursive(file, function (err, res) {
                                results = results.concat(res);
                                if (!--pending) done(null, results);
                            });
                        } else {
                            results.push(file);
                            if (!--pending) done(null, results);
                        }
                    });
                });
            });
        }
    });

    it("email and session flow work with random user ID", async function () {
        await startST();
        let token = undefined;
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
                EmailVerification.init({
                    mode: "REQUIRED",
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                ...oI,
                                sendEmail: async function (input) {
                                    token = input.emailVerifyLink.split("?token=")[1].split("&rid=")[0];
                                },
                            };
                        },
                    },
                    getEmailForRecipeUserId: async function (recipeUserId) {
                        if (recipeUserId.getAsString() === "random") {
                            return {
                                status: "OK",
                                email: "test@example.com",
                            };
                        } else {
                            return {
                                status: "UNKNOWN_USER_ID_ERROR",
                            };
                        }
                    },
                }),
                Session.init(),
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

        let session = await Session.createNewSessionWithoutRequestResponse(supertokens.convertToRecipeUserId("random"));

        // now we check if the email is verified or not
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === false);
        }

        // we generate an email verification token
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(token !== undefined);
        }

        // now we verify the token
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .send({
                        method: "token",
                        token,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(JSON.parse(response.text).status === "OK");
        }

        // now we check if the email is verified or not
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === true);
        }
    });

    it("email and session flow work with random user ID, with session during verify email", async function () {
        await startST();
        let token = undefined;
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
                EmailVerification.init({
                    mode: "REQUIRED",
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                ...oI,
                                sendEmail: async function (input) {
                                    token = input.emailVerifyLink.split("?token=")[1].split("&rid=")[0];
                                },
                            };
                        },
                    },
                    getEmailForRecipeUserId: async function (recipeUserId) {
                        if (recipeUserId.getAsString() === "random") {
                            return {
                                status: "OK",
                                email: "test@example.com",
                            };
                        } else {
                            return {
                                status: "UNKNOWN_USER_ID_ERROR",
                            };
                        }
                    },
                }),
                Session.init(),
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async function (_, __, ___, userContext) {
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

        let session = await Session.createNewSessionWithoutRequestResponse(supertokens.convertToRecipeUserId("random"));

        // now we check if the email is verified or not
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === false);
        }

        // we generate an email verification token
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify/token")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(token !== undefined);
        }

        // now we verify the token
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        method: "token",
                        token,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(JSON.parse(response.text).status === "OK");
        }

        // now we check if the email is verified or not
        {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(response !== undefined);
            assert(response.body.status === "OK");
            assert(response.body.isVerified === true);
        }
    });
});
