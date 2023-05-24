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

describe(`accountlinkingTests: ${printPath("[test/accountlinking/userstructure.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("hasSameEmailAs function in user object work", async function () {
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

        assert(user.loginMethods[0].hasSameEmailAs("test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs(" Test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs("test@examplE.com"));
        assert(!user.loginMethods[0].hasSameEmailAs("t2est@examplE.com"));
    });

    it("toJson works as expected", async function () {
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

        let jsonifiedUser = user.toJson();

        user.loginMethods[0].recipeUserId = user.loginMethods[0].recipeUserId.getAsString();
        assert.deepEqual(jsonifiedUser, user);
    });

    it("hasSamePhoneNumberAs function in user object work", async function () {
        // TODO:...
    });

    it("hasSameThirdPartyInfoAs function in user object work", async function () {
        // TODO:...
    });
});
