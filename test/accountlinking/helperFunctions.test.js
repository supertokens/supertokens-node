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
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let EmailVerification = require("../../recipe/emailverification");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let AccountLinkingRecipe = require("../../lib/build/recipe/accountlinking/recipe").default;

describe(`accountlinkingTests: ${printPath("[test/accountlinking/helperFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createPrimaryUserIdOrLinkAccounts tests", function () {
        it("calling createPrimaryUserIdOrLinkAccounts with primary user returns the same user", async function () {
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
                ],
            });

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;

            assert(user.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
            user = await supertokens.getUser(user.id);
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === true);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === user.id);
        });

        it("calling createPrimaryUserIdOrLinkAccounts should create a primary user if possible", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token, false);

            user = await supertokens.getUser(user.id);
            assert(user.isPrimaryUser === false);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === user.id);
            let userObj = await supertokens.getUser(user.id);
            assert(userObj.isPrimaryUser);
            assert(userObj.id === user.id);
            assert(userObj.loginMethods.length === 1);
        });

        it("calling createPrimaryUserIdOrLinkAccounts with account linking disabled should not create a primary user", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            user = await supertokens.getUser(user.id);

            assert(user.isPrimaryUser === false);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === user.id);
            let userObj = await supertokens.getUser(user.id);
            assert(!userObj.isPrimaryUser);
            assert(userObj.id === user.id);
            assert(userObj.loginMethods.length === 1);
        });

        it("calling createPrimaryUserIdOrLinkAccounts with account linking enabled by require verification should not create a primary user", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            assert(user.isPrimaryUser === false);
            assert(user.loginMethods[0].verified === false);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === user.id);
            let userObj = await supertokens.getUser(user.id);
            assert(!userObj.isPrimaryUser);
            assert(userObj.id === user.id);
            assert(userObj.loginMethods.length === 1);
        });

        it("calling createPrimaryUserIdOrLinkAccounts should link accounts if possible", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
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
                ],
            });

            let primaryUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            assert(primaryUser.isPrimaryUser === false);

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            user = await supertokens.getUser(user.id);

            assert(user.isPrimaryUser === false);
            assert(user.loginMethods[0].verified === true);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === primaryUser.id);
            let userObj = await supertokens.getUser(primaryUser.id);
            assert(userObj.isPrimaryUser);
            assert(userObj.id === primaryUser.id);
            assert(userObj.loginMethods.length === 2);
        });

        it("calling createPrimaryUserIdOrLinkAccounts should not link accounts if account linking is disabled", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
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
                ],
            });

            let primaryUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            user = await supertokens.getUser(user.id);

            assert(user.isPrimaryUser === false);
            assert(user.loginMethods[0].verified === true);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === user.id);
            let userObj = await supertokens.getUser(user.id);
            assert(!userObj.isPrimaryUser);
            assert(userObj.id === user.id);
            assert(userObj.loginMethods.length === 1);
        });

        it("calling createPrimaryUserIdOrLinkAccounts should not link accounts if account linking is enabled, but verification is required", async function () {
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
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
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
                ],
            });

            let primaryUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            assert(user.isPrimaryUser === false);
            assert(user.loginMethods[0].verified === false);

            let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === user.id);
            let userObj = await supertokens.getUser(user.id);
            assert(!userObj.isPrimaryUser);
            assert(userObj.id === user.id);
            assert(userObj.loginMethods.length === 1);
        });
    });

    describe("getPrimaryUserIdThatCanBeLinkedToRecipeUserId tests", function () {
        it("calling getPrimaryUserIdThatCanBeLinkedToRecipeUserId returns undefined if nothing can be linked", async function () {
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
                ],
            });

            let primaryUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            assert(user.isPrimaryUser === false);

            let response = await AccountLinking.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response === undefined);
        });

        it("calling getPrimaryUserIdThatCanBeLinkedToRecipeUserId returns the right primary user if it can be linked", async function () {
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
                ],
            });

            let primaryUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            assert(user.isPrimaryUser === false);

            let response = await AccountLinking.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response.id === primaryUser.id);
        });
    });

    describe("isSignUpAllowed tests", function () {
        it("calling isSignUpAllowed returns true if the email is unique", async function () {
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                true
            );

            assert(isAllowed);
        });

        it("calling isSignUpAllowed throws an error if email and phone number is provided to it.", async function () {
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            try {
                await AccountLinking.isSignUpAllowed(
                    {
                        phoneNumber: "",
                        email: "test@example.com",
                    },
                    true
                );
                assert(false);
            } catch (err) {
                assert(err.message === "Please pass one of email or phone number, not both");
            }
        });

        it("calling isSignUpAllowed returns true if user exists with same email, but is not a primary user, and email verification not required", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(isAllowed);
        });

        it("calling isSignUpAllowed returns true if user exists with same email, but is not a primary user, and account linking is disabled", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(isAllowed);
        });

        it("calling isSignUpAllowed returns true if user exists with same email, but is not a primary user, and email verification is not required", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(isAllowed);
        });

        it("calling isSignUpAllowed returns false if user exists with same email, but is not a primary user, and email verification is required", async function () {
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

            await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(!isAllowed);
            assert(
                (await ProcessState.getInstance().waitForEvent(
                    PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
                )) !== undefined
            );
        });

        it("calling isSignUpAllowed returns false if 2 users exists with same email, are not primary users, one of them has email verified, and one of them not, and email verification is required", async function () {
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });
            assert(!epUser.user.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(epUser.user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            {
                let user = await supertokens.getUser(epUser.user.id);
                assert(user.isPrimaryUser === false);
            }

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false,
                {
                    doNotLink: true,
                }
            );
            assert(!tpUser.user.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(!isAllowed);
            assert(
                (await ProcessState.getInstance().waitForEvent(
                    PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
                )) !== undefined
            );
        });

        it("calling isSignUpAllowed returns false if user exists with same email, but primary user's email is not verified", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);
            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(!isAllowed);
        });

        it("calling isSignUpAllowed returns true if user exists with same email, and primary user's email is not verified, but automatic account linking is disabled", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);
            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                false
            );

            assert(isAllowed);
        });

        it("calling isSignUpAllowed returns true if primary user's email is verified", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);

            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                pUser.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                true
            );

            assert(isAllowed);
        });

        it("calling isSignUpAllowed returns true if primary user's email is verified and other recipe user's email is not verified, with the same email", async function () {
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);

            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                pUser.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            await ThirdParty.manuallyCreateOrUpdateUser("public", "abcd", "abcd", "test@example.com", false);

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                true
            );

            assert(isAllowed);
        });
    });

    describe("listUsersByAccountInfo tests", function () {
        it("listUsersByAccountInfo does and properly", async function () {
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
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
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
                    Session.init(),
                ],
            });

            await EmailPassword.signUp("public", "test@example.com", "password123");

            await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false);

            let users = await supertokens.listUsersByAccountInfo({
                email: "test@example.com",
                thirdParty: {
                    id: "google",
                    userId: "abc",
                },
            });

            assert(users.length === 1);
        });

        it("listUsersByAccountInfo does OR properly", async function () {
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
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
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
                    Session.init(),
                ],
            });

            await EmailPassword.signUp("public", "test@example.com", "password123");

            await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false);

            let users = await supertokens.listUsersByAccountInfo(
                {
                    email: "test@example.com",
                    thirdParty: {
                        id: "google",
                        userId: "abc",
                    },
                },
                true
            );

            assert(users.length === 2);
        });
    });

    describe("isEmailChangeAllowed tests", function () {
        it("isEmailChangeAllowed returns false if checking for email which belongs to other primary and if email password user is not a primary user or is not linked, and account linking is enabled and email verification is required", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(recipeUserId, "test@example.com");

            assert(response === false);
        });

        it("isEmailChangeAllowed returns true when updating email which belongs to other primary account and if email password user is not a primary user or is not linked, and account linking is enabled and email verification is not required", async function () {
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

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123", {
                doNotLink: true,
            });
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            let isAllowed = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(isAllowed === true);
        });

        it("isEmailChangeAllowed returns false if checking for email which belongs to other primary and if email password user is also a primary user, and account linking is enabled and email verification is required", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            await AccountLinking.createPrimaryUser(response.user.loginMethods[0].recipeUserId);

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(response === false);
        });

        it("isEmailChangeAllowed returns true if checking for email which does not belong to other primary and if email password user is also a primary user, and account linking is enabled and email verification is required", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            await AccountLinking.createPrimaryUser(response.user.loginMethods[0].recipeUserId);

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns false if checking for email which belongs to other primary and if email password user is also a primary user, and account linking is enabled and email verification is not required", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === true);

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(response === false);
        });

        it("isEmailChangeAllowed returns true if checking for email which does not belong to other primary and if email password user is also a primary user, and account linking is enabled and email verification is not required", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            await AccountLinking.createPrimaryUser(response.user.loginMethods[0].recipeUserId);

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns false if checking for email which belongs to other primary and if email password user is also a primary user, and account linking is disabled", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user, session, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldDoAutomaticAccountLinking: false,
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

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === true);

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false,
                {
                    doNotLink: true,
                }
            );

            assert(response === false);
        });

        it("isEmailChangeAllowed returns true if checking for email which does not belong to other primary and if email password user is also a primary user, and account linking is disabled", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user, session, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldDoAutomaticAccountLinking: false,
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

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === true);

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false,
                {
                    doNotLink: true,
                }
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns true if it's verified, even though email exist for other primary user and this user is a recipe user.", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                true
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns true if email has not changed and is not a primary user, even though another primary user exists with the same email", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns true if checking for email which belongs to other primary and if email password user is not a primary user or is not linked, and account linking is disabled", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user, _, userContext) => {
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

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false,
                {
                    doNotLink: true,
                }
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns true if checking for email which belongs to other primary and if email password user is not a primary user or is not linked, and account linking is enabled but email verification is not required", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user, _, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: true,
                                    shouldRequireVerification: false,
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

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false,
                {
                    doNotLink: true,
                }
            );

            assert(response === true);
        });

        it("isEmailChangeAllowed returns true recipe user id is changing email with no primary user id having that email", async function () {
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
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, user, _, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test2@example.com",
                false
            );

            assert(response === true);
        });
    });

    describe("isSignInAllowed tests", function () {
        it("calling isSignInAllowed returns true if the email is unique", async function () {
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "abcd1234");

            let isAllowed = await AccountLinking.isSignInAllowed(user.user.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed returns true if user exists with same email, but is not a primary user, and email verification not required", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let user = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignInAllowed(user.user.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed returns true if user exists with same email, but is not a primary user, and account linking is disabled", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignInAllowed(user.user.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed returns true if user exists with same email, but is not a primary user, and email verification is not required", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let user = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignInAllowed(user.user.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed returns false if user exists with same email, but is not a primary user, and email verification is required", async function () {
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

            let user = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            let isAllowed = await AccountLinking.isSignInAllowed(user.user.loginMethods[0].recipeUserId);

            assert(!isAllowed);
            assert(
                (await ProcessState.getInstance().waitForEvent(
                    PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
                )) !== undefined
            );
        });

        it("calling isSignInAllowed returns false if 2 users exists with same email, are not primary users, one of them has email verified, and one of them not, and email verification is required", async function () {
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });
            assert(!epUser.user.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(epUser.user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            {
                let user = await supertokens.getUser(epUser.user.id);
                assert(user.isPrimaryUser === false);
            }

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false,
                {
                    doNotLink: true,
                }
            );
            assert(!tpUser.user.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignInAllowed(tpUser.user.loginMethods[0].recipeUserId);

            assert(!isAllowed);
            assert(
                (await ProcessState.getInstance().waitForEvent(
                    PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
                )) !== undefined
            );
        });

        it("calling isSignInAllowed returns false if user exists with same email, but primary user's email is not verified", async function () {
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
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);
            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignInAllowed(pUser.loginMethods[0].recipeUserId);

            assert(isAllowed);

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "abcd", "abcd", "test@example.com", false)
            ).user;
            assert(tpUser.isPrimaryUser === false);

            isAllowed = await AccountLinking.isSignInAllowed(tpUser.loginMethods[0].recipeUserId);

            assert(!isAllowed);
        });

        it("calling isSignInAllowed returns true if user exists with same email, and primary user's email is not verified, but automatic account linking is disabled", async function () {
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
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);
            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignInAllowed(pUser.loginMethods[0].recipeUserId);

            assert(isAllowed);

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "abcd", "abcd", "test@example.com", false)
            ).user;
            assert(tpUser.isPrimaryUser === false);

            isAllowed = await AccountLinking.isSignInAllowed(tpUser.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed returns true if recipe user's email is verified and primary user's email is verified", async function () {
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);

            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                pUser.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "abcd", "abcd", "test@example.com", true, {
                    doNotLink: true,
                })
            ).user;
            assert(tpUser.isPrimaryUser === false);
            assert(tpUser.loginMethods[0].verified);

            isAllowed = await AccountLinking.isSignInAllowed(tpUser.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed returns true if primary user's email is verified and other recipe user's email is not verified, with the same email", async function () {
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);

            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                pUser.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let user = await ThirdParty.manuallyCreateOrUpdateUser("public", "abcd", "abcd", "test@example.com", false);

            let user2 = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "abcd1",
                "abcd",
                "test@example.com",
                true
            );

            let isAllowed = await AccountLinking.isSignInAllowed(user2.user.loginMethods[0].recipeUserId);

            assert(isAllowed);
        });

        it("calling isSignInAllowed with primary user does not call the helper function", async function () {
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
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let pUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);
            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);

            let isAllowed = await AccountLinking.isSignInAllowed(pUser.loginMethods[0].recipeUserId);

            assert(isAllowed);

            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED)) ===
                    undefined
            );
        });
    });

    describe("verifyEmailForRecipeUserIfLinkedAccountsAreVerified tests", function () {
        it("verifyEmailForRecipeUserIfLinkedAccountsAreVerified should not crash if email verification is not defined", async function () {
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "password123", {
                doNotLink: true,
            });

            await AccountLinkingRecipe.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                recipeUserId: user.user.loginMethods[0].recipeUserId,
            });
        });

        it("verifyEmailForRecipeUserIfLinkedAccountsAreVerified marks email as verified of linked user with same email", async function () {
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
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "password123");
            let tokens = await EmailVerification.createEmailVerificationToken(
                "public",
                user.user.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", tokens.token);
            await AccountLinking.createPrimaryUser(user.user.loginMethods[0].recipeUserId);

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "abc",
                "abcd",
                "test@example.com",
                false
            );
            await AccountLinking.linkAccounts("public", tpUser.user.loginMethods[0].recipeUserId, user.user.id);

            await AccountLinkingRecipe.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                recipeUserId: tpUser.user.loginMethods[0].recipeUserId,
            });

            let pUser = await supertokens.getUser(user.user.id);
            assert(pUser.loginMethods[0].verified === true);
            assert(pUser.loginMethods[1].verified === true);

            assert(pUser.loginMethods[0].recipeUserId.getAsString() === user.user.id);
            assert(pUser.loginMethods[1].recipeUserId.getAsString() === tpUser.user.id);
        });

        it("verifyEmailForRecipeUserIfLinkedAccountsAreVerified does not mark email as verified of linked user that has different email", async function () {
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
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "password123");
            let tokens = await EmailVerification.createEmailVerificationToken(
                "public",
                user.user.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", tokens.token);
            await AccountLinking.createPrimaryUser(user.user.loginMethods[0].recipeUserId);

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "abc",
                "abcd",
                "test2@example.com",
                false
            );
            await AccountLinking.linkAccounts("public", tpUser.user.loginMethods[0].recipeUserId, user.user.id);

            await AccountLinkingRecipe.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                recipeUserId: tpUser.user.loginMethods[0].recipeUserId,
            });

            let pUser = await supertokens.getUser(user.user.id);
            assert(pUser.loginMethods[0].verified === true);
            assert(pUser.loginMethods[1].verified === false);

            assert(pUser.loginMethods[0].recipeUserId.getAsString() === user.user.id);
            assert(pUser.loginMethods[1].recipeUserId.getAsString() === tpUser.user.id);
        });

        it("verifyEmailForRecipeUserIfLinkedAccountsAreVerified does not mark email as verified of linked user with same email if no other linked user has email as verified", async function () {
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
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "password123");
            await AccountLinking.createPrimaryUser(user.user.loginMethods[0].recipeUserId);

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "abc",
                "abcd",
                "test2@example.com",
                false
            );
            await AccountLinking.linkAccounts("public", tpUser.user.loginMethods[0].recipeUserId, user.user.id);

            await AccountLinkingRecipe.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                recipeUserId: tpUser.user.loginMethods[0].recipeUserId,
            });

            let pUser = await supertokens.getUser(user.user.id);
            assert(pUser.loginMethods[0].verified === false);
            assert(pUser.loginMethods[1].verified === false);

            assert(pUser.loginMethods[0].recipeUserId.getAsString() === user.user.id);
            assert(pUser.loginMethods[1].recipeUserId.getAsString() === tpUser.user.id);
        });

        it("verifyEmailForRecipeUserIfLinkedAccountsAreVerified does not change email verification status of non linked user", async function () {
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
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "abc",
                "abcd",
                "test2@example.com",
                false
            );

            await AccountLinkingRecipe.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                recipeUserId: tpUser.user.loginMethods[0].recipeUserId,
            });

            let pUser = await supertokens.getUser(tpUser.user.id);
            assert(pUser.loginMethods[0].verified === false);

            assert(pUser.loginMethods[0].recipeUserId.getAsString() === tpUser.user.id);
        });
    });
});
