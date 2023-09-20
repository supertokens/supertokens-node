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

const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let ThirdPartyEmailPasswordRecipe = require("../../lib/build/recipe/thirdpartyemailpassword/recipe").default;

describe(`configTest: ${printPath("[test/thirdpartyemailpassword/config.test.js]")}`, function () {
    before(function () {
        this.customProvider = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        return {
                            thirdPartyUserId: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };
    });
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test default config for thirdpartyemailpassword module", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init()],
        });

        let thirdpartyemailpassword = await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();

        assert.notEqual(thirdpartyemailpassword.thirdPartyRecipe, undefined); // thirdparty recipe should be initialized even if no providers are given

        let emailpassword = thirdpartyemailpassword.emailPasswordRecipe;

        let signUpFeature = emailpassword.config.signUpFeature;
        assert.strictEqual(signUpFeature.formFields.length, 2);
        assert.strictEqual(signUpFeature.formFields.filter((f) => f.id === "email")[0].optional, false);
        assert.strictEqual(signUpFeature.formFields.filter((f) => f.id === "password")[0].optional, false);
        assert.notStrictEqual(signUpFeature.formFields.filter((f) => f.id === "email")[0].validate, undefined);
        assert.notStrictEqual(signUpFeature.formFields.filter((f) => f.id === "password")[0].validate, undefined);

        let signInFeature = emailpassword.config.signInFeature;
        assert.strictEqual(signInFeature.formFields.length, 2);
        assert.strictEqual(signInFeature.formFields.filter((f) => f.id === "email")[0].optional, false);
        assert.strictEqual(signInFeature.formFields.filter((f) => f.id === "password")[0].optional, false);
        assert.notStrictEqual(signInFeature.formFields.filter((f) => f.id === "email")[0].validate, undefined);
        assert.notStrictEqual(signInFeature.formFields.filter((f) => f.id === "password")[0].validate, undefined);

        let resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature;

        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id, "email");
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id, "password");
    });

    it("test config for thirdpartyemailpassword module, with provider", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider],
                }),
            ],
        });

        let thirdpartyemailpassword = await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
        let thirdParty = thirdpartyemailpassword.thirdPartyRecipe;

        assert.notStrictEqual(thirdParty, undefined);
        let emailVerificationFeatureTP = thirdpartyemailpassword.thirdPartyRecipe.config.emailVerificationFeature;

        let emailpassword = thirdpartyemailpassword.emailPasswordRecipe;

        let signUpFeature = emailpassword.config.signUpFeature;
        assert.strictEqual(signUpFeature.formFields.length, 2);
        assert.strictEqual(signUpFeature.formFields.filter((f) => f.id === "email")[0].optional, false);
        assert.strictEqual(signUpFeature.formFields.filter((f) => f.id === "password")[0].optional, false);
        assert.notStrictEqual(signUpFeature.formFields.filter((f) => f.id === "email")[0].validate, undefined);
        assert.notStrictEqual(signUpFeature.formFields.filter((f) => f.id === "password")[0].validate, undefined);

        let signInFeature = emailpassword.config.signInFeature;
        assert.strictEqual(signInFeature.formFields.length, 2);
        assert.strictEqual(signInFeature.formFields.filter((f) => f.id === "email")[0].optional, false);
        assert.strictEqual(signInFeature.formFields.filter((f) => f.id === "password")[0].optional, false);
        assert.notStrictEqual(signInFeature.formFields.filter((f) => f.id === "email")[0].validate, undefined);
        assert.notStrictEqual(signInFeature.formFields.filter((f) => f.id === "password")[0].validate, undefined);

        let resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature;

        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id, "email");
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id, "password");
    });
});
