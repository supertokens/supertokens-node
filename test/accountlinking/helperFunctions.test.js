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
let EmailVerification = require("../../recipe/emailverification");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let AccountLinkingRecipe = require("../../lib/build/recipe/accountlinking/recipe").default;

describe(`configTest: ${printPath("[test/accountlinking/helperFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

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
            recipeList: [EmailPassword.init()],
        });

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;

        assert(user.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: true,
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

        assert(user.isPrimaryUser === false);

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: true,
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

        assert(user.isPrimaryUser === false);

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: true,
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

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: false,
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: true,
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: true,
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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

        let response = await AccountLinking.createPrimaryUserIdOrLinkAccounts({
            isVerified: false,
            recipeUserId: user.loginMethods[0].recipeUserId,
            checkAccountsToLinkTableAsWell: true,
        });

        assert(response === user.id);
        let userObj = await supertokens.getUser(user.id);
        assert(!userObj.isPrimaryUser);
        assert(userObj.id === user.id);
        assert(userObj.loginMethods.length === 1);
    });

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
            await ThirdParty.signInUp("google", "abc", "test2@example.com", {
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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

        let isAllowed = await AccountLinkingRecipe.getInstance().isSignUpAllowed({
            newUser: {
                email: "test@example.com",
            },
            allowLinking: true,
        });

        assert(isAllowed);
    });

    it("calling isSignUpAllowed returns true if user exists with same email, but is not a primary user", async function () {
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

        let isAllowed = await AccountLinkingRecipe.getInstance().isSignUpAllowed({
            newUser: {
                email: "test@example.com",
            },
            allowLinking: false,
        });

        assert(isAllowed);
    });

    it("calling isSignUpAllowed returns false if user exists with same email, but linking is not allowed", async function () {
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

        let isAllowed = await AccountLinkingRecipe.getInstance().isSignUpAllowed({
            newUser: {
                email: "test@example.com",
            },
            allowLinking: false,
        });

        assert(!isAllowed);
    });

    it("calling isSignUpAllowed returns true if user exists with same email, but linking is not allowed, but automatic account linking is disabled", async function () {
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

        let isAllowed = await AccountLinkingRecipe.getInstance().isSignUpAllowed({
            newUser: {
                email: "test@example.com",
            },
            allowLinking: false,
        });

        assert(isAllowed);
    });

    it("calling isSignUpAllowed returns false if linking is allowed, and email is not verified", async function () {
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

        let isAllowed = await AccountLinkingRecipe.getInstance().isSignUpAllowed({
            newUser: {
                email: "test@example.com",
            },
            allowLinking: true,
        });

        assert(!isAllowed);
    });

    it("calling isSignUpAllowed returns true if linking is allowed, and email is verified", async function () {
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

        let isAllowed = await AccountLinkingRecipe.getInstance().isSignUpAllowed({
            newUser: {
                email: "test@example.com",
            },
            allowLinking: true,
        });

        assert(isAllowed);
    });

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

        let session = await Session.createNewSessionWithoutRequestResponse(supertokens.convertToRecipeUserId("random"));

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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test@example.com",
            newUserPassword: "password123",
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test@example.com",
            newUserPassword: "password123",
            userContext: {
                doNotLink2: true,
            },
        });

        assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
        assert(response.description === "Account linking not allowed by the developer for existing user.");
        assert(numberOfTimesCallbackCalled === 0);
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
                newUserEmail: "test@example.com",
                newUserPassword: "password123",
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test2@example.com",
            newUserPassword: "password123",
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test2@example.com",
            newUserPassword: "password123",
        });

        assert(response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
        assert(response.primaryUserId === thirdPartyUser.id);
        let recipeUsers = await supertokens.listUsersByAccountInfo({
            email: "test2@example.com",
        });
        assert(response.recipeUserId.getAsString() === recipeUsers[0].id);
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test@example.com",
            newUserPassword: "password123",
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
                doNotLink: true,
            })
        ).user;

        await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

        let thirdPartyUser2 = (
            await ThirdParty.signInUp("google", "abc1", "test2@example.com", {
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
            newUserEmail: "test2@example.com",
            newUserPassword: "password123",
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
                doNotLink: true,
            })
        ).user;

        await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(thirdPartyUser.id));

        let thirdPartyUser2 = (
            await ThirdParty.signInUp("google", "abc1", "test2@example.com", {
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
            newUserEmail: "test3@example.com",
            newUserPassword: "password123",
        });

        // this does not return email verification needed cause we are using the
        // same email as an already linked account (test2@example.com third party account)
        assert(response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
        assert(response.primaryUserId === thirdPartyUser.id);
        let recipeUsers = await supertokens.listUsersByAccountInfo({
            email: "test3@example.com",
        });
        assert(response.recipeUserId.getAsString() === recipeUsers[0].id);
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test3@example.com",
            newUserPassword: "password123",
        });

        assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
        assert(
            response.description ===
                "No account can be linked to the session account cause the session account is not a primary account and the account info is already associated with another primary account, so we cannot make this a primary account either. Please contact support."
        );
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
            await ThirdParty.signInUp("google", "abc", "test@example.com", {
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
            newUserEmail: "test@example.com",
            newUserPassword: "password123",
        });

        assert(response.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
        assert(response.description === "Account linking not allowed by the developer for new account.");
    });
});
