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

            let user = (await EmailPassword.signUp("test@example.com", "password123")).user;

            assert(user.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token);

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
                await EmailPassword.signUp("test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token, false);

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
                await EmailPassword.signUp("test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token, false);
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
                await EmailPassword.signUp("test@example.com", "password123", {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            assert(primaryUser.isPrimaryUser === false);

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token, false);
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token, false);
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
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

        it("calling getPrimaryUserIdThatCanBeLinkedToRecipeUserId returns from account to link to table in priority", async function () {
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
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            assert(user.isPrimaryUser === false);

            let accountToLinkToUser = (
                await EmailPassword.signUp("test2@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(accountToLinkToUser.loginMethods[0].recipeUserId);

            let resp = await AccountLinking.storeIntoAccountToLinkTable(
                user.loginMethods[0].recipeUserId,
                accountToLinkToUser.id
            );
            assert(resp.status === "OK");

            let response = await AccountLinking.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
            });

            assert(response.id === accountToLinkToUser.id);
        });

        it("calling getPrimaryUserIdThatCanBeLinkedToRecipeUserId takes into account checkAccountsToLinkTableAsWell boolean", async function () {
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
                ],
            });

            let primaryUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(primaryUser.id));

            let user = (
                await EmailPassword.signUp("test@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            assert(user.isPrimaryUser === false);

            let accountToLinkToUser = (
                await EmailPassword.signUp("test2@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(accountToLinkToUser.loginMethods[0].recipeUserId);

            let resp = await AccountLinking.storeIntoAccountToLinkTable(
                user.loginMethods[0].recipeUserId,
                accountToLinkToUser.id
            );
            assert(resp.status === "OK");

            let response = await AccountLinking.getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                recipeUserId: user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: false,
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

            await EmailPassword.signUp("test@example.com", "password123", {
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

            await EmailPassword.signUp("test@example.com", "password123", {
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

            await EmailPassword.signUp("test@example.com", "password123", {
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

            await EmailPassword.signUp("test@example.com", "password123", {
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
                    PROCESS_STATE.IS_SIGN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123", {
                doNotLink: true,
            });
            assert(!epUser.user.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(epUser.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token, false);
            {
                let user = await supertokens.getUser(epUser.user.id);
                assert(user.isPrimaryUser === false);
            }

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                doNotLink: true,
            });
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
                    PROCESS_STATE.IS_SIGN_UP_ALLOWED_NO_PRIMARY_USER_EXISTS
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

            let pUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
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

            let pUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
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

            let pUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);

            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(pUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
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

            let pUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(pUser.loginMethods[0].recipeUserId);

            pUser = await supertokens.getUser(pUser.id);
            assert(pUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(pUser.loginMethods[0].recipeUserId);
            await EmailVerification.verifyEmailUsingToken(token.token);

            let isAllowed = await AccountLinking.isSignUpAllowed(
                {
                    email: "test@example.com",
                },
                true
            );

            assert(isAllowed);
        });
    });

    describe("linkAccountWithUserFromSession tests", function () {
        it("calling linkAccountWithUserFromSession with a random user ID does not throw an error", async function () {
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            let response = await AccountLinking.linkAccountsWithUserFromSession({
                session,
                newUser: {
                    recipeId: "emailpassword",
                    email: "test@example.com",
                },
                createRecipeUserFunc: () => {},
                verifyCredentialsFunc: () => {
                    return {
                        status: "OK",
                    };
                },
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(
                response.description ===
                    "Accounts cannot be linked because the session belongs to a user ID that does not exist in SuperTokens."
            );
        });

        it("calling linkAccountWithUserFromSession throws an error if email and phone number is provided to it", async function () {
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            try {
                await AccountLinking.linkAccountsWithUserFromSession({
                    session,
                    newUser: {
                        recipeId: "passwordless",
                        email: "test@example.com",
                        phoneNumber: "",
                    },
                    createRecipeUserFunc: () => {},
                    verifyCredentialsFunc: () => {
                        return {
                            status: "OK",
                        };
                    },
                });
                assert(false);
            } catch (err) {
                assert(err.message === "Please pass one of email or phone number, not both");
            }
        });

        it("calling linkAccountWithUserFromSession makes the session user a primary user and then links.", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            assert(!thirdPartyUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test@example.com",
                password: "password123",
            });

            assert(response.status === "OK");
            assert(!response.wereAccountsAlreadyLinked);

            let primaryUser = await supertokens.getUser(thirdPartyUser.id);
            assert(primaryUser.isPrimaryUser);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.id === session.getUserId());

            assert(callbackNewAccount.email === "test@example.com");
            assert(callbackNewAccount.recipeId === "emailpassword");
            assert(callbackUser.id === thirdPartyUser.id);
            assert(numberOfTimesCallbackCalled === 1);
        });

        it("calling linkAccountWithUserFromSession fails when existing user can't be made into a primary user", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            if (userContext.doNotLink2 && newAccountInfo.recipeId === "thirdparty") {
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            assert(!thirdPartyUser.isPrimaryUser);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test@example.com",
                password: "password123",
                userContext: {
                    doNotLink2: true,
                },
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(response.description === "Account linking not allowed by the developer for existing user.");
            assert(numberOfTimesCallbackCalled === 0);

            let users = await supertokens.listUsersByAccountInfo({
                email: "test@example.com",
            });

            assert(users.length === 1);
            assert(users[0].loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSession throws email verification claim failure if the session user's email is not verified and we are trying to make it a primary user", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
                        shouldDoAutomaticAccountLinking: async (newAccountInfo, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            if (userContext.doNotLink2 && newAccountInfo.recipeId === "thirdparty") {
                                return {
                                    shouldAutomaticallyLink: true,
                                    shouldRequireVerification: true,
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            assert(!thirdPartyUser.isPrimaryUser);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            try {
                await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                    session,
                    email: "test@example.com",
                    password: "password123",
                    userContext: {
                        doNotLink2: true,
                    },
                });
                assert(false);
            } catch (err) {
                try {
                    await session.assertClaims([EmailVerification.EmailVerificationClaim.validators.isTrue()]);
                    assert(false);
                } catch (expectedError) {
                    assert.deepStrictEqual(expectedError, err);
                }
            }

            assert(numberOfTimesCallbackCalled === 0);

            let users = await supertokens.listUsersByAccountInfo({
                email: "test@example.com",
            });

            assert(users.length === 1);
            assert(users[0].loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSession links correctly when the session's recipe user id is a primary user id and email verification is not required", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "OK");
            assert(!response.wereAccountsAlreadyLinked);

            let primaryUser = await supertokens.getUser(thirdPartyUser.id);
            assert(primaryUser.isPrimaryUser);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.id === session.getUserId());
            assert(primaryUser.emails.length === 2);

            assert(callbackNewAccount.email === "test2@example.com");
            assert(callbackNewAccount.recipeId === "emailpassword");
            assert(callbackUser.id === thirdPartyUser.id);
            assert(numberOfTimesCallbackCalled === 1);
        });

        it("calling linkAccountWithUserFromSession does not link when the session's recipe user id is a primary user id and email verification is required and different emails", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
            assert(response.primaryUserId === thirdPartyUser.id);
            assert(response.email === "test2@example.com");
            let recipeUsers = await supertokens.listUsersByAccountInfo({
                email: "test2@example.com",
            });
            assert(response.recipeUserId.getAsString() === recipeUsers[0].id);

            // we also check that account to link has a mapping here
            let toLink = await AccountLinking.fetchFromAccountToLinkTable(response.recipeUserId);
            assert(toLink === response.primaryUserId);
        });

        it("calling linkAccountWithUserFromSession does linking when the session's recipe user id is a primary user id and email verification is required and same emails, even though email is not verified.", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test@example.com",
                password: "password123",
            });

            assert(response.status === "OK");
        });

        it("calling linkAccountWithUserFromSession links accounts correctly even though the session's recipe user id not the primary user id", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            let thirdPartyUser2 = (
                await ThirdParty.signInUp("google", "abc1", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.linkAccounts(supertokens.convertToRecipeUserId(thirdPartyUser2.id), thirdPartyUser.id);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser2.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            // this does not return email verification needed cause we are using the
            // same email as an already linked account (test2@example.com third party account)
            assert(response.status === "OK");
            assert(!response.wereAccountsAlreadyLinked);

            let primaryUser = await supertokens.getUser(thirdPartyUser.id);
            assert(primaryUser.isPrimaryUser);
            assert(primaryUser.loginMethods.length === 3);
            assert(primaryUser.id === session.getUserId());
            assert(primaryUser.emails.length === 2);

            assert(callbackNewAccount.email === "test2@example.com");
            assert(callbackNewAccount.recipeId === "emailpassword");
            assert(callbackUser.id === thirdPartyUser.id);
            assert(numberOfTimesCallbackCalled === 2);
        });

        it("calling linkAccountWithUserFromSession returns verification needed even if session belongs to a linked recipe user and new user is not verified", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            let thirdPartyUser2 = (
                await ThirdParty.signInUp("google", "abc1", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.linkAccounts(supertokens.convertToRecipeUserId(thirdPartyUser2.id), thirdPartyUser.id);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser2.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test3@example.com",
                password: "password123",
            });

            assert(response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
            assert(response.primaryUserId === thirdPartyUser.id);
            assert(response.email === "test3@example.com");
            let recipeUsers = await supertokens.listUsersByAccountInfo({
                email: "test3@example.com",
            });
            assert(response.recipeUserId.getAsString() === recipeUsers[0].id);

            // we also check that account to link has a mapping here
            let toLink = await AccountLinking.fetchFromAccountToLinkTable(response.recipeUserId);
            assert(toLink === response.primaryUserId);
        });

        it("calling linkAccountWithUserFromSession fails if session user is not a primary user and there exists another primary user with the same account info", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            let epUser1 = await EmailPassword.signUp("test@example.com", "password123", {
                doNotLink: true,
            });
            assert(!epUser1.user.isPrimaryUser);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(epUser1.user.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test3@example.com",
                password: "password123",
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(
                response.description ===
                    "No account can be linked to the session account cause the session account is not a primary account and the account info is already associated with another primary account, so we cannot make this a primary account either. Please contact support."
            );

            let users = await supertokens.listUsersByAccountInfo({
                email: "test3@example.com",
            });

            assert(users.length === 0);
        });

        it("calling linkAccountWithUserFromSession fails if should do automatic account linking is set to false.", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test@example.com",
                password: "password123",
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(response.description === "Account linking not allowed by the developer for new account.");

            let users = await supertokens.listUsersByAccountInfo({
                email: "test@example.com",
            });

            assert(users.length === 1);
            assert(users[0].loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSession should fail if it will cause two primary users with the same email (when creating a new recipe user).", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            // we create the first primary user
            let pUser = (
                await ThirdParty.signInUp("google", "abc1", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(pUser.id));

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(
                response.description ===
                    "Not allowed because it will lead to two primary user id having same account info."
            );

            let users = await supertokens.listUsersByAccountInfo({
                email: "test2@example.com",
            });

            assert(users.length === 1);
            assert(users[0].loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSession fails if recipe user ID already existed and we give it wrong credentials", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // we create the new recipe user id first
            await EmailPassword.signUp("test2@example.com", "password123", {
                doNotLink: true,
            });

            // now we try and do the linking, but with wrong password.
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password",
            });

            assert(response.status === "WRONG_CREDENTIALS_ERROR");
        });

        it("calling linkAccountWithUserFromSession succeeds if recipe user ID already existed, and passing in correct credentials", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // we create the new recipe user id first
            await EmailPassword.signUp("test2@example.com", "password123", {
                doNotLink: true,
            });

            // now we try and do the linking, but with wrong password.
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "OK");
        });

        it("calling linkAccountWithUserFromSession fails if new account is a primary user.", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // we create the new recipe user id first
            let epUser = (
                await EmailPassword.signUp("test2@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.id));

            // now we try and do the linking, but with wrong password.
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(response.description === "New user is already linked to another account or is a primary user.");
        });

        it("calling linkAccountWithUserFromSession fails if new account is linked to another primary user.", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // we create another primary user and link the recipe account to it
            let newPrimaryUser = (
                await ThirdParty.signInUp("google", "abc1", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(newPrimaryUser.id));
            let epUser = (await EmailPassword.signUp("test2@example.com", "password123")).user;
            assert(epUser.isPrimaryUser);
            assert(epUser.id === newPrimaryUser.id);

            // now we try and do the linking, but with wrong password.
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(response.description === "New user is already linked to another account or is a primary user.");
        });

        it("calling linkAccountWithUserFromSession succeeds when trying on already linked user", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser);
            assert(epUser.id === thirdPartyUser.id);

            // now we try and do the linking, but with wrong password.
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test@example.com",
                password: "password123",
            });

            assert(response.status === "OK");
            assert(response.wereAccountsAlreadyLinked);
        });

        it("calling linkAccountWithUserFromSession should fail if it will cause two primary users with the same email (when the recipe user already existed).", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // we create the first primary user
            let pUser = (
                await ThirdParty.signInUp("google", "abc1", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(pUser.id));

            // then we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            let epUser = (
                await EmailPassword.signUp("test2@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;
            assert(!epUser.isPrimaryUser);

            // now we try and do the linking
            let response = await EmailPassword.linkEmailPasswordAccountsWithUserFromSession({
                session,
                email: "test2@example.com",
                password: "password123",
            });

            assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(
                response.description ===
                    "Not allowed because it will lead to two primary user id having same account info."
            );
            assert(
                (await ProcessState.getInstance().waitForEvent(
                    PROCESS_STATE.ACCOUNT_LINKING_NOT_ALLOWED_ERROR_END_OF_linkAccountWithUserFromSession_FUNCTION
                )) !== undefined
            );
        });

        it("calling linkAccountWithUserFromSession creates a new recipe user even if normal sign up would not allow it - case 1", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            assert(!thirdPartyUser.isPrimaryUser);
            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // creating a recipe user with the test2@example.com
            let tpUser2 = (
                await ThirdParty.signInUp("google1", "abc", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;
            assert(tpUser2.isPrimaryUser === false);

            // we test isSignUpAllowed returns false
            let response = await AccountLinking.isSignUpAllowed(
                {
                    recipeId: "thirdparty",
                    email: "test2@example.com",
                    thirdParty: {
                        id: "google2",
                        userId: "abcd",
                    },
                },
                true
            );
            assert(response === false);

            // now we try and do the linking
            response = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                isVerified: true,
                email: "test2@example.com",
                thirdPartyId: "google2",
                thirdPartyUserId: "abcd",
            });

            assert(response.status === "OK");
            assert(!response.wereAccountsAlreadyLinked);

            let primaryUser = await supertokens.getUser(thirdPartyUser.id);
            assert(primaryUser.isPrimaryUser);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.id === session.getUserId());

            assert(callbackNewAccount.email === "test2@example.com");
            assert(callbackNewAccount.recipeId === "thirdparty");
            assert(callbackUser.id === thirdPartyUser.id);
            assert(numberOfTimesCallbackCalled === 1);
        });

        it("calling linkAccountWithUserFromSession creates a new recipe user even if normal sign up would not allow it - case 2", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (
                await ThirdParty.signInUp("google", "abc", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.createPrimaryUser(thirdPartyUser.loginMethods[0].recipeUserId);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // we test isSignUpAllowed returns false
            let response = await AccountLinking.isSignUpAllowed(
                {
                    recipeId: "thirdparty",
                    email: "test@example.com",
                    thirdParty: {
                        id: "google2",
                        userId: "abcd",
                    },
                },
                true
            );
            assert(response === false);

            // now we try and do the linking
            response = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                isVerified: true,
                email: "test@example.com",
                thirdPartyId: "google2",
                thirdPartyUserId: "abcd",
            });

            assert(response.status === "OK");
            assert(!response.wereAccountsAlreadyLinked);

            let primaryUser = await supertokens.getUser(thirdPartyUser.id);
            assert(primaryUser.isPrimaryUser);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.id === session.getUserId());

            assert(callbackNewAccount.email === "test@example.com");
            assert(callbackNewAccount.recipeId === "thirdparty");
            assert(callbackUser.id === thirdPartyUser.id);
            assert(numberOfTimesCallbackCalled === 1);
        });

        it("calling linkAccountWithUserFromSession creates a new recipe user even if normal sign up would not allow it - case 3", async function () {
            await startST();
            let callbackUser = undefined;
            let callbackNewAccount = undefined;
            let numberOfTimesCallbackCalled = 0;
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
                        onAccountLinked: (user, newAccount) => {
                            numberOfTimesCallbackCalled++;
                            callbackUser = user;
                            callbackNewAccount = newAccount;
                        },
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

            // first we create a recipe user with third party
            let thirdPartyUser = (await ThirdParty.signInUp("google", "abc", "test@example.com", true)).user;
            assert(thirdPartyUser.isPrimaryUser === true);

            // now we create a new session for this user.
            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(thirdPartyUser.id)
            );

            // we test isSignUpAllowed returns false
            let response = await AccountLinking.isSignUpAllowed(
                {
                    recipeId: "thirdparty",
                    email: "test@example.com",
                    thirdParty: {
                        id: "google2",
                        userId: "abcd",
                    },
                },
                false
            );
            assert(response === false);

            // now we try and do the linking
            response = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                isVerified: false,
                email: "test@example.com",
                thirdPartyId: "google2",
                thirdPartyUserId: "abcd",
            });

            assert(response.status === "OK");
            assert(!response.wereAccountsAlreadyLinked);

            let primaryUser = await supertokens.getUser(thirdPartyUser.id);
            assert(primaryUser.isPrimaryUser);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.id === session.getUserId());

            assert(callbackNewAccount.email === "test@example.com");
            assert(callbackNewAccount.recipeId === "thirdparty");
            assert(callbackUser.id === thirdPartyUser.id);
            assert(numberOfTimesCallbackCalled === 1);
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    Session.init(),
                ],
            });

            await EmailPassword.signUp("test@example.com", "password123");

            await ThirdParty.signInUp("google", "abc", "test@example.com", false);

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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    Session.init(),
                ],
            });

            await EmailPassword.signUp("test@example.com", "password123");

            await ThirdParty.signInUp("google", "abc", "test@example.com", false);

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

            let user = await ThirdParty.signInUp("google", "abc", "test@example.com", true);

            let response = await EmailPassword.signUp("test2@example.com", "password123");
            assert(response.user.isPrimaryUser === false);
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            response = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com"
            );

            assert(response === false);
        });
    });
});
