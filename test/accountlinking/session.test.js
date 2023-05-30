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
let { AccountLinkingClaim } = require("../../recipe/accountlinking");
let AccountLinking = require("../../recipe/accountlinking").default;
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");

describe(`sessionTests: ${printPath("[test/accountlinking/session.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewSessionWithoutRequestResponse tests", function () {
        it("create new session with no linked accounts should have same user id and recipe id", async function () {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("create new session with linked accounts should have different user id and recipe id", async function () {
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });
    });
});
