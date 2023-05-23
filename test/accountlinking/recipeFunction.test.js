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

// TODO: check that post account linking, email is auto marked as verified (which should work both ways).

describe(`configTest: ${printPath("[test/accountlinking/recipeFunction.test.js]")}`, function () {
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

        let response = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        assert(response.status === "OK");
        assert(response.user.isPrimaryUser === true);
        assert(response.wasAlreadyAPrimaryUser === false);

        assert(response.user.id === user.id);
        assert((response.user.emails = user.emails));
        assert((response.user.loginMethods.length = 1));

        let refetchedUser = await supertokens.getUser(user.id);

        refetchedUser.loginMethods[0].recipeUserId = user.loginMethods[0].recipeUserId.getAsString();

        response.user.loginMethods[0].recipeUserId = response.user.loginMethods[0].recipeUserId.getAsString();

        // we do the json parse/stringify to remove the toJson and other functions in the login
        // method array in each of the below user objects.
        assert.deepStrictEqual(JSON.parse(JSON.stringify(refetchedUser)), JSON.parse(JSON.stringify(response.user)));
    });

    it("make primary user succcess - already is a primary user", async function () {
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

        let response = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        assert(response.status === "OK");

        let response2 = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        assert(response2.status === "OK");
        assert(response2.user.id === user.id);
        assert(response2.wasAlreadyAPrimaryUser);
    });

    it("make primary user failure - recipe user already linked to another user", async function () {
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
            ],
        });

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        let response = await AccountLinking.createPrimaryUser(user2.loginMethods[0].recipeUserId);
        assert(response.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);
    });

    it("make primary user failure - account info user already associated with a primary user", async function () {
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await ThirdParty.signInUp("google", "abc", "test@example.com")).user;

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        let response = await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user2.id));
        assert(response.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);
    });

    it("link accounts success", async function () {
        await startST();
        let primaryUserInCallback;
        let newAccountInfoInCallback;
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                        newAccountInfoInCallback = newAccountInfo;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse(user2.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked === false);

        let linkedUser = await supertokens.getUser(user.id);
        // we do the json parse/stringify to remove the toJson and other functions in the login
        // method array in each of the below user objects.
        assert.deepStrictEqual(
            JSON.parse(JSON.stringify(linkedUser)),
            JSON.parse(JSON.stringify(primaryUserInCallback))
        );

        assert(newAccountInfoInCallback.recipeId === "emailpassword");
        assert(newAccountInfoInCallback.email === "test2@example.com");
        sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("link accounts success - already linked", async function () {
        await startST();
        let primaryUserInCallback;
        let newAccountInfoInCallback;
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                        newAccountInfoInCallback = newAccountInfo;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        primaryUserInCallback = undefined;
        newAccountInfoInCallback = undefined;

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse(user2.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        assert(response.status === "OK");
        assert(response.accountsAlreadyLinked);

        assert(primaryUserInCallback === undefined);
        assert(newAccountInfoInCallback === undefined);

        sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);
    });

    it("link accounts failure - recipe user id already linked with another primary user id", async function () {
        await startST();
        let primaryUserInCallback;
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
                    onAccountLinked: (primaryUser, newAccountInfo) => {
                        primaryUserInCallback = primaryUser;
                    },
                }),
            ],
        });

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        let otherPrimaryUser = (await EmailPassword.signUp("test3@example.com", "password123")).user;
        await AccountLinking.createPrimaryUser(otherPrimaryUser.loginMethods[0].recipeUserId);

        primaryUserInCallback = undefined;

        let response = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, otherPrimaryUser.id);

        assert(response.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);

        assert(primaryUserInCallback === undefined);
    });

    it("account linking failure - account info user already associated with a primary user", async function () {
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        let user2 = (await ThirdParty.signInUp("google", "abc", "test@example.com")).user;
        let otherPrimaryUser = (await EmailPassword.signUp("test3@example.com", "password123")).user;

        let response = await AccountLinking.linkAccounts(
            supertokens.convertToRecipeUserId(user2.id),
            otherPrimaryUser.id
        );

        assert(response.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        assert(response.primaryUserId === user.id);
    });

    it("unlinking accounts success and removes session", async function () {
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse(user2.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user2.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.unlinkAccount(user2.loginMethods[0].recipeUserId);
        assert(response.wasRecipeUserDeleted === false);

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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse(user.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.unlinkAccount(user.loginMethods[0].recipeUserId);
        assert(response.wasRecipeUserDeleted === false);

        let primaryUser = await supertokens.getUser(user.id);
        assert(primaryUser !== undefined);
        assert(primaryUser.loginMethods.length === 1);
        assert(!primaryUser.isPrimaryUser);

        sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("unlinking accounts where user id is primary user causes that user id to be deleted", async function () {
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user2.isPrimaryUser === false);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

        // we create a new session to check that the session has not been revoked
        // when we link accounts, cause these users are already linked.
        await Session.createNewSessionWithoutRequestResponse(user.loginMethods[0].recipeUserId);
        let sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 1);

        let response = await AccountLinking.unlinkAccount(user.loginMethods[0].recipeUserId);
        assert(response.wasRecipeUserDeleted === true);

        let primaryUser = await supertokens.getUser(user.id);
        assert(primaryUser !== undefined);
        assert(primaryUser.loginMethods.length === 1);
        assert(primaryUser.isPrimaryUser);

        let recipeUser = await supertokens.getUser(user2.id);

        // we do the json parse/stringify to remove the toJson and other functions in the login
        // method array in each of the below user objects.
        assert.deepStrictEqual(JSON.parse(JSON.stringify(recipeUser)), JSON.parse(JSON.stringify(primaryUser)));

        sessions = await Session.getAllSessionHandlesForUser(user.loginMethods[0].recipeUserId.getAsString());
        assert(sessions.length === 0);
    });

    it("delete user successful", async function () {
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === true);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === true);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
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

        let user = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(user.isPrimaryUser === true);
        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
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

    it("set in account to link table success", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "OK");
        assert(storeResponse.didInsertNewRow);

        let response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response !== undefined);
        assert(response === primaryUser.id);
    });

    it("set in account to link table success - already inserted", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "OK");
        assert(!storeResponse.didInsertNewRow);

        let response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response !== undefined);
        assert(response === primaryUser.id);
    });

    it("set in account to link table failure - already linked", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        await AccountLinking.linkAccounts(user.loginMethods[0].recipeUserId, primaryUser.id);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR");
        assert(storeResponse.primaryUserId === primaryUser.id);
    });

    it("set in account to link table failure - input user id not a primary user", async function () {
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

        let user1 = (await EmailPassword.signUp("test@example.com", "password123")).user;

        let user2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user1.loginMethods[0].recipeUserId,
            user2.id
        );
        assert(storeResponse.status === "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR");
    });

    it("set in account to link table failure - already linked", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);
        await AccountLinking.linkAccounts(user.loginMethods[0].recipeUserId, primaryUser.id);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR");
        assert(storeResponse.primaryUserId === primaryUser.id);
    });

    it("entry is removed from account to link table when linked", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "OK");
        let response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response !== undefined);

        await AccountLinking.linkAccounts(user.loginMethods[0].recipeUserId, primaryUser.id);
        response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response === undefined);
    });

    it("entry is removed from account to link table when made primary", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "OK");
        let response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response !== undefined);

        await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);

        response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response === undefined);
    });

    it("entry is removed from account to link table when unlinked", async function () {
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

        let primaryUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
        assert(primaryUser.isPrimaryUser === false);
        await AccountLinking.createPrimaryUser(primaryUser.loginMethods[0].recipeUserId);

        let user = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        assert(user.isPrimaryUser === false);

        let storeResponse = await AccountLinking.storeIntoAccountToLinkTable(
            user.loginMethods[0].recipeUserId,
            primaryUser.id
        );
        assert(storeResponse.status === "OK");
        let response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response !== undefined);

        await AccountLinking.unlinkAccount(primaryUser.loginMethods[0].recipeUserId);

        response = await AccountLinking.fetchFromAccountToLinkTable(user.loginMethods[0].recipeUserId);
        assert(response === undefined);
    });
});
