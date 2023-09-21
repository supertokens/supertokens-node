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
let ThirdParty = require("../../recipe/thirdparty");
let Passwordless = require("../../recipe/passwordless");

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

        let { user } = await EmailPassword.signUp("public", "test@example.com", "password123");

        assert(user.loginMethods[0].hasSameEmailAs("test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs(" Test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs("test@examplE.com"));
        assert(!user.loginMethods[0].hasSameEmailAs("t2est@examplE.com"));
    });

    it("toJson works as expected", async function () {
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

        let { user } = await EmailPassword.signUp("public", "test@example.com", "password123");

        let jsonifiedUser = user.toJson();

        user.loginMethods[0].recipeUserId = user.loginMethods[0].recipeUserId.getAsString();
        assertJSONEquals(jsonifiedUser, user);
    });

    it("hasSameThirdPartyInfoAs function in user object work", async function () {
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

        let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "google",
            "abcd",
            "test@example.com",
            false
        );

        assert(user.loginMethods[0].hasSameEmailAs("test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs(" Test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs("test@examplE.com"));
        assert(!user.loginMethods[0].hasSameEmailAs("t2est@examplE.com"));

        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "google",
                userId: "abcd",
            })
        );
        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "google ",
                userId: " abcd",
            })
        );
        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: " google ",
                userId: "abcd ",
            })
        );
        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: " google",
                userId: "   abcd",
            })
        );
        assert(
            !user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: " gOogle",
                userId: "aBcd",
            })
        );
        assert(
            !user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "abc",
                userId: "abcd",
            })
        );
        assert(
            !user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "google",
                userId: "aabcd",
            })
        );
    });

    it("hasSamePhoneNumberAs function in user object work", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        const { status, user } = await Passwordless.signInUp({ tenantId: "public", phoneNumber: "+36701234123" });

        assert.strictEqual(status, "OK");

        assert(user.loginMethods[0].hasSamePhoneNumberAs("+36701234123"));
        assert(user.loginMethods[0].hasSamePhoneNumberAs("      \t+36701234123 \t       "));
        assert(user.loginMethods[0].hasSamePhoneNumberAs("      \t+36-70/1234 123 \t       "));
        assert(user.loginMethods[0].hasSamePhoneNumberAs("      \t+36-70/1234-123 \t       "));
        // TODO: validate these cases should map to false
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("36701234123"));
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("0036701234123"));
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("06701234123"));
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("p36701234123"));
    });
});
