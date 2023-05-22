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

/**
 * TODO:
 *  - All recipe functions and their output types
 *  - Fetch from account to link table is cleared after linking or making a primary user.
 *  - Test toJson function
 *  - Test hasSameEmail etc functions
 */

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
            recipeList: [EmailPassword.init(), Session.init()],
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
});
