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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/emailpassword.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("sign up tests", function () {
        it("sign up without account linking does not make primary user", async function () {
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
                recipeList: [EmailPassword.init()],
            });

            let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
        });

        it("sign up with account linking makes primary user if email verification is not require", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(user.isPrimaryUser);
        });

        it("sign up with account linking does not make primary user if email verification is required", async function () {
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

            let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
        });

        it("sign up allowed even if account linking is on and email already used by another recipe (cause in recipe level, it is allowed), but no linking happens if email verification is required", async function () {
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
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let response = await EmailPassword.signUp("test@example.com", "password123");

            assert(response.status === "OK");
            assert(response.user.id !== user.user.id);
            assert(response.user.isPrimaryUser === false);
        });

        it("sign up allowed if account linking is on, email verification is off, and email already used by another recipe", async function () {
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
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let response = await EmailPassword.signUp("test@example.com", "password123");

            assert(response.status === "OK");
            assert(response.user.id === user.user.id);
            assert(response.user.loginMethods.length === 2);
        });

        it("sign up allowed if account linking is off, and email already used by another recipe", async function () {
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
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let response = await EmailPassword.signUp("test@example.com", "password123");

            assert(response.status === "OK");
        });

        it("sign up doesn't link user to existing account if email verification is needed", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            if (newAccountInfo.recipeId === "emailpassword") {
                                let existingUser = await supertokens.listUsersByAccountInfo({
                                    email: newAccountInfo.email,
                                });
                                let doesEmailPasswordUserExist = existingUser.length > 1;
                                if (!doesEmailPasswordUserExist) {
                                    return {
                                        shouldAutomaticallyLink: false,
                                    };
                                }
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let response = await EmailPassword.signUp("test@example.com", "password123");

            assert(response.status === "OK");
            assert(response.user.id !== user.user.id);
            assert(!response.user.isPrimaryUser);
        });
    });

    describe("update email or password tests", function () {
        it("update email which belongs to other primary account, and current user is also a primary user should not work", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let response = await EmailPassword.signUp("test2@example.com", "password123");
            assert(response.user.isPrimaryUser);
            assert(response.status === "OK");

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
        });

        it("update email which belongs to other primary account should work if email password user is not a primary user or is not linked, and account linking is disabled", async function () {
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let tokenResp = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(tokenResp.token);

            let response = await EmailPassword.signUp("test2@example.com", "password123");
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "OK");
            let isVerified = await EmailVerification.isEmailVerified(recipeUserId);
            assert(!isVerified);
        });

        it("update email which belongs to other primary account should not work if email password user is not a primary user or is not linked, and account linking is enabled and email verification is required", async function () {
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let tokenResp = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(tokenResp.token);

            let response = await EmailPassword.signUp("test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
            assert(response.reason === "New email is associated with another primary user ID");
        });

        it("update email which belongs to other primary account should not work if email password user is not a primary user or is not linked, and account linking is enabled and email verification is not required", async function () {
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let tokenResp = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(tokenResp.token);

            let response = await EmailPassword.signUp("test2@example.com", "password123", {
                doNotLink: true,
            });
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
            assert(response.reason === "New email is associated with another primary user ID");
        });

        it("update email which belongs to linked user should mark email as verified of email password user", async function () {
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com");

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.user.id));

            let tokenResp = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(tokenResp.token);

            let response = await EmailPassword.signUp("test2@example.com", "password123");
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            await AccountLinking.linkAccounts(response.user.loginMethods[0].recipeUserId, user.user.id);

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "OK");
            let isVerified = await EmailVerification.isEmailVerified(recipeUserId);
            assert(isVerified);
        });
    });
});