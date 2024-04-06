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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const EmailVerification = require("../../recipe/emailverification");
let { isCDIVersionCompatible } = require("../utils");
const { default: RecipeUserId } = require("../../lib/build/recipeUserId");
let ThirdParty = require("../../recipe/thirdparty");

describe(`recipeFunctions: ${printPath("[test/thirdparty/recipeFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test that creating a user with ThirdParty, and they have a verified email that, isEmailVerified returns true and the opposite case
    it("for ThirdParty user that isEmailVerified returns the correct email verification status", async function () {
        const connectionURI = await startST();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [{ config: { thirdPartyId: "customProvider" } }],
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        // create a ThirdParty user with a verified email
        let response = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "customProvider",
            "verifiedUser",
            "test@example.com",
            false
        );

        // verify the user's email
        let emailVerificationToken = await EmailVerification.createEmailVerificationToken(
            "public",
            STExpress.convertToRecipeUserId(response.user.id),
            response.user.email
        );
        await EmailVerification.verifyEmailUsingToken("public", emailVerificationToken.token);

        // check that the ThirdParty user's email is verified
        assert(await EmailVerification.isEmailVerified(STExpress.convertToRecipeUserId(response.user.id)));

        // create a ThirdParty user with an unverfied email and check that it is not verified
        let response2 = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "customProvider2",
            "NotVerifiedUser",
            "test@example.com",
            false
        );

        assert(
            !(await EmailVerification.isEmailVerified(
                STExpress.convertToRecipeUserId(response2.user.id),
                response2.user.email
            ))
        );
    });
});
