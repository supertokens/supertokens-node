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
    assertJSONEquals,
    startSTWithMultitenancyAndAccountLinking,
} = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let EmailVerification = require("../../recipe/emailverification");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/recipeFunction.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("make primary user success", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init()],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;

        assert(user.isPrimaryUser === false);

        let response = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        assert(response.status === "OK");
        assert(response.user.isPrimaryUser === true);
        assert(response.wasAlreadyAPrimaryUser === false);

        assert(response.user.id === user.id);
        assert(response.user.emails[0] == user.emails[0]);
        assert((response.user.loginMethods.length = 1));

        let refetchedUser = await supertokens.getUser(user.id);

        // we do the json parse/stringify to remove the toJson and other functions in the login
        // method array in each of the below user objects.
        assertJSONEquals(refetchedUser.toJson(), response.user.toJson());
    });

    it("make primary user succcess - already is a primary user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init()],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;

        assert(user.isPrimaryUser === false);

        let response = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        assert(response.status === "OK");

        let response2 = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        assert(response2.status === "OK");
        assert(response2.user.id === user.id);
        assert(response2.wasAlreadyAPrimaryUser);
    });

    it("make primary user failure - recipe user already linked to another user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
            ],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        let response = await AccountLinking.createPrimaryUser(user2.loginMethods[0].recipeUserId);
        assert(response.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);
    });

    it("make primary user failure - account info user already associated with a primary user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false))
            .user;

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        let response = await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user2.id));
        assert(response.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);
    });

    it("link accounts success", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        let primaryUserInCallback;
        let newAccountInfoInCallback;
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                        newAccountInfoInCallback = newAccountInfo;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse("public", user2.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let linkedUser = await supertokens.getUser(user.id);
        // we do the json parse/stringify to remove the toJson and other functions in the login
        // method array in each of the below user objects.
        assertJSONEquals(linkedUser, primaryUserInCallback);
        assertJSONEquals(linkedUser, response.user);

        assert(newAccountInfoInCallback.recipeId === "emailpassword");
        assert(newAccountInfoInCallback.email === "test2@example.com");
        sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("link accounts success, even if using recipe user id that is linked to the primary user id", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        let primaryUserInCallback;
        let newAccountInfoInCallback;
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                        newAccountInfoInCallback = newAccountInfo;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let user3 = (await EmailPassword.signUp("public", "test3@example.com", "password123")).user;
        assert(user3.isPrimaryUser === false);

        response = await AccountLinking.linkAccounts(user3.loginMethods[0].recipeUserId, user2.id);
        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let linkedUser = await supertokens.getUser(user.id);
        assert(linkedUser.loginMethods.length === 3);
        assertJSONEquals(linkedUser, response.user);
    });

    it("link accounts success - already linked", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        let primaryUserInCallback;
        let newAccountInfoInCallback;
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                        newAccountInfoInCallback = newAccountInfo;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        const initialResp = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
        assert.strictEqual(initialResp.status, "OK");
        assert.notStrictEqual(initialResp.user, undefined);

        primaryUserInCallback = undefined;
        newAccountInfoInCallback = undefined;

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse("public", user2.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert.strictEqual(sessions.length, 1);

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert.strictEqual(response.status, "OK");
        assert(response.accountsAlreadyLinked);
        assertJSONEquals(response.user.toJson(), initialResp.user.toJson());

        assert.strictEqual(primaryUserInCallback, undefined);
        assert.strictEqual(newAccountInfoInCallback, undefined);

        sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert.strictEqual(sessions.length, 1);
    });

    it("link accounts failure - recipe user id already linked with another primary user id", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        let primaryUserInCallback;
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        let otherPrimaryUser = (await EmailPassword.signUp("public", "test3@example.com", "password123")).user;
        await AccountLinking.createPrimaryUser(otherPrimaryUser.loginMethods[0].recipeUserId);

        primaryUserInCallback = undefined;

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, otherPrimaryUser.id);

        assert(response.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);

        assert(primaryUserInCallback === undefined);
    });

    it("link accounts failure - input user is not a primary user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        let primaryUserInCallback;
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        let resp = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
        assert(resp.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER");
    });

    it("account linking failure - account info user already associated with a primary user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        let user2 = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false))
            .user;
        let otherPrimaryUser = (await EmailPassword.signUp("public", "test3@example.com", "password123")).user;
        await AccountLinking.createPrimaryUser(otherPrimaryUser.loginMethods[0].recipeUserId);

        let response = await AccountLinking.linkAccounts(
            supertokens.convertToRecipeUserId(user2.id),
            otherPrimaryUser.id
        );

        assert.strictEqual(response.status, "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        assert.strictEqual(response.primaryUserId, user.id);
    });

    it("unlinking accounts success and removes session", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse("public", user2.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.unlinkAccount(user2.loginMethods[0].recipeUserId);
        assert(response.wasRecipeUserDeleted === false);
        assert(response.wasLinked === true);

        let primaryUser = await supertokens.getUser(user.id);
        assert(primaryUser !== undefined);
        assert(primaryUser.loginMethods.length === 1);
        assert(primaryUser.isPrimaryUser);

        let recipeUser = await supertokens.getUser(user2.id);
        assert(recipeUser !== undefined);
        assert(recipeUser.loginMethods.length === 1);
        assert(!recipeUser.isPrimaryUser);

        sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("unlinking account of primary user causes it to become a recipe user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse("public", user.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.unlinkAccount(user.loginMethods[0].recipeUserId);
        assert(response.wasRecipeUserDeleted === false);
        assert(response.wasLinked === true);

        let primaryUser = await supertokens.getUser(user.id);
        assert(primaryUser !== undefined);
        assert(primaryUser.loginMethods.length === 1);
        assert(!primaryUser.isPrimaryUser);

        sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("unlinking accounts where user id is primary user causes that user id to be deleted", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse("public", user.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.unlinkAccount(user.loginMethods[0].recipeUserId);
        assert(response.wasRecipeUserDeleted === true);
        assert(response.wasLinked === true);

        let primaryUser = await supertokens.getUser(user.id);
        assert(primaryUser !== undefined);
        assert(primaryUser.loginMethods.length === 1);
        assert(primaryUser.isPrimaryUser);

        let recipeUser = await supertokens.getUser(user2.id);

        // we do the json parse/stringify to remove the toJson and other functions in the login
        // method array in each of the below user objects.
        assertJSONEquals(recipeUser.toJson(), primaryUser.toJson());

        sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("delete user successful", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                        if (newAccountInfo.email === "test2@example.com" && user === undefined) {
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

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === true);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
        {
            let primaryUser = await supertokens.getUser(user.id);
            assert(primaryUser !== undefined);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.isPrimaryUser);
        }
        await supertokens.deleteUser(user2.id, false);

        {
            let primaryUser = await supertokens.getUser(user.id);
            assert(primaryUser !== undefined);
            assert(primaryUser.loginMethods.length === 1);
            assert(primaryUser.loginMethods[0].recipeUserId.getAsString() === primaryUser.id);
            assert(primaryUser.isPrimaryUser);
        }
    });

    it("delete user successful - primary user being deleted", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                        if (newAccountInfo.email === "test2@example.com" && user === undefined) {
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

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === true);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
        {
            let primaryUser = await supertokens.getUser(user.id);
            assert(primaryUser !== undefined);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.isPrimaryUser);
        }
        await supertokens.deleteUser(user.id, false);

        {
            let primaryUser = await supertokens.getUser(user.id);
            assert(primaryUser !== undefined);
            assert(primaryUser.loginMethods.length === 1);
            assert(primaryUser.loginMethods[0].recipeUserId.getAsString() === user2.id);
            assert(primaryUser.isPrimaryUser);
        }
    });

    it("delete user successful - remove all linked accounts", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
                    shouldDoAutomaticAccountLinking: async (newAccountInfo, user) => {
                        if (newAccountInfo.email === "test2@example.com" && user === undefined) {
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

        let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        assert(user.isPrimaryUser === true);
        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
        {
            let primaryUser = await supertokens.getUser(user.id);
            assert(primaryUser !== undefined);
            assert(primaryUser.loginMethods.length === 2);
            assert(primaryUser.isPrimaryUser);
        }
        await supertokens.deleteUser(user.id);

        {
            let primaryUser = await supertokens.getUser(user.id);
            assert(primaryUser === undefined);
        }

        {
            let user = await supertokens.getUser(user2.id);
            assert(user === undefined);
        }
    });

    it("link accounts success causes new account's email to be verified if same email", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
            ],
        });

        let user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false))
            .user;
        assert(user.isPrimaryUser === false);

        let token = await EmailVerification.createEmailVerificationToken(
            "public",
            supertokens.convertToRecipeUserId(user.id)
        );
        await EmailVerification.verifyEmailUsingToken("public", token.token);

        let user2 = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;

        await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let isVerified = await EmailVerification.isEmailVerified(user2.loginMethods[0].recipeUserId);
        assert(isVerified === true);
    });

    it("link accounts success does not cause primary user's account's email to be verified if same email", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
            ],
        });

        let user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false))
            .user;

        let user2 = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;

        let user3 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;

        let token = await EmailVerification.createEmailVerificationToken(
            "public",
            supertokens.convertToRecipeUserId(user2.id)
        );
        await EmailVerification.verifyEmailUsingToken("public", token.token);

        await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        await AccountLinking.linkAccounts(user3.loginMethods[0].recipeUserId, user.id);

        {
            let isVerified = await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(user.id));
            assert(isVerified === false);
        }

        {
            let isVerified = await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(user3.id));
            assert(isVerified === false);
        }
    });

    it("link accounts success does not cause new account's email to be verified if different email", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
            ],
        });

        let user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false))
            .user;

        let token = await EmailVerification.createEmailVerificationToken(
            "public",
            supertokens.convertToRecipeUserId(user.id)
        );
        await EmailVerification.verifyEmailUsingToken("public", token.token);

        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;

        await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let isVerified = await EmailVerification.isEmailVerified(user2.loginMethods[0].recipeUserId);
        assert(isVerified === false);
    });

    it("link accounts does not cause primary user's account's email to be verified if different email", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
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
            ],
        });

        let user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", "test@example.com", false))
            .user;

        let user2 = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;

        let token = await EmailVerification.createEmailVerificationToken(
            "public",
            supertokens.convertToRecipeUserId(user2.id)
        );
        await EmailVerification.verifyEmailUsingToken("public", token.token);

        await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let isVerified = await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(user.id));
        assert(isVerified === false);
    });
});
