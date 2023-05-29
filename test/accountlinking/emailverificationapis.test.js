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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
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

        it("updateSessionIfRequiredPostEmailVerification removes account linking claim post verification", async function () {
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

            let tokens = extractInfoFromResponse(res);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let claimValue = await newSession.getClaimValue(AccountLinking.AccountLinkingClaim);
            let newUser = await supertokens.getUser(claimValue);
            assert(newUser.emails[0] === "test2@example.com");
            assert(newUser.emails.length === 1);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);

            let token = (
                await EmailVerification.createEmailVerificationToken(supertokens.convertToRecipeUserId(claimValue))
            ).token;

            let response2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .set("Cookie", ["sAccessToken=" + tokens.accessTokenFromAny])
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

            tokens = extractInfoFromResponse(response2);
            newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            claimValue = await newSession.getClaimValue(AccountLinking.AccountLinkingClaim);
            assert(claimValue === undefined);
            assert(newSession.getUserId() === pUser.id);

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
});
