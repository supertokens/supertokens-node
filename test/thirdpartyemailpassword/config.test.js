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
    createServerlessCacheForTesting,
} = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let ThirdPartyEmailPasswordRecipe = require("../../lib/build/recipe/thirdpartyemailpassword/recipe").default;
const { removeServerlessCache } = require("../../lib/build/utils");

describe(`configTest: ${printPath("[test/thirdpartyemailpassword/config.test.js]")}`, function () {
    before(function () {
        this.customProvider = {
            id: "custom",
            get: async (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
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
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test default config for thirdpartyemailpassword module", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdPartyEmailPassword.init()],
        });

        let thirdpartyemailpassword = await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();

        assert.strictEqual(thirdpartyemailpassword.thirdPartyRecipe, undefined);

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

        assert.strictEqual(emailpassword.config.signOutFeature.disableDefaultImplementation, false);

        let resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature;

        assert.strictEqual(resetPasswordUsingTokenFeature.disableDefaultImplementation, false);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id, "email");
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id, "password");

        let emailVerificationFeatureEP = emailpassword.config.emailVerificationFeature;

        assert.strictEqual(emailVerificationFeatureEP.disableDefaultImplementation, true);

        let emailVerificationRecipe = thirdpartyemailpassword.emailVerificationRecipe;

        assert.strictEqual(emailVerificationRecipe.config.disableDefaultImplementation, false);

        assert.deepStrictEqual(await thirdpartyemailpassword.config.sessionFeature.setJwtPayload(), {});
        assert.deepStrictEqual(await thirdpartyemailpassword.config.sessionFeature.setSessionData(), {});
        assert.deepStrictEqual(await emailpassword.config.sessionFeature.setJwtPayload(), {});
        assert.deepStrictEqual(await emailpassword.config.sessionFeature.setSessionData(), {});
    });

    it("test config for thirdpartyemailpassword module, with provider", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
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
        assert.strictEqual(thirdParty.config.signOutFeature.disableDefaultImplementation, true);

        let emailVerificationFeatureTP = thirdpartyemailpassword.thirdPartyRecipe.config.emailVerificationFeature;

        assert.strictEqual(emailVerificationFeatureTP.disableDefaultImplementation, true);

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

        assert.strictEqual(emailpassword.config.signOutFeature.disableDefaultImplementation, false);

        let resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature;

        assert.strictEqual(resetPasswordUsingTokenFeature.disableDefaultImplementation, false);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id, "email");
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length, 1);
        assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id, "password");

        let emailVerificationFeatureEP = emailpassword.config.emailVerificationFeature;

        assert.strictEqual(emailVerificationFeatureEP.disableDefaultImplementation, true);

        let emailVerificationRecipe = thirdpartyemailpassword.emailVerificationRecipe;

        assert.strictEqual(emailVerificationRecipe.config.disableDefaultImplementation, false);
        assert.deepStrictEqual(await thirdpartyemailpassword.config.sessionFeature.setJwtPayload(), {});
        assert.deepStrictEqual(await thirdpartyemailpassword.config.sessionFeature.setSessionData(), {});
        assert.deepStrictEqual(await emailpassword.config.sessionFeature.setJwtPayload(), {});
        assert.deepStrictEqual(await emailpassword.config.sessionFeature.setSessionData(), {});
        assert.deepStrictEqual(
            await thirdpartyemailpassword.thirdPartyRecipe.config.sessionFeature.setJwtPayload(),
            {}
        );
        assert.deepStrictEqual(
            await thirdpartyemailpassword.thirdPartyRecipe.config.sessionFeature.setSessionData(),
            {}
        );
    });

    it("test sessionRecipe functions", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyEmailPassword.init({
                    sessionFeature: {
                        setJwtPayload: async (user, context, action) => {
                            return { user, context, action };
                        },
                        setSessionData: async (user, context, action) => {
                            return { user, context, action };
                        },
                    },
                    providers: [this.customProvider],
                }),
            ],
        });

        let thirdpartyemailpassword = await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();
        assert.deepStrictEqual(
            await thirdpartyemailpassword.emailPasswordRecipe.config.sessionFeature.setJwtPayload(
                "user-1",
                [
                    {
                        id: "test",
                        value: false,
                    },
                ],
                "signin"
            ),
            {
                user: "user-1",
                context: {
                    loginType: "emailpassword",
                    formFields: [
                        {
                            id: "test",
                            value: false,
                        },
                    ],
                },
                action: "signin",
            }
        );
        assert.deepStrictEqual(
            await thirdpartyemailpassword.emailPasswordRecipe.config.sessionFeature.setSessionData(
                "user-2",
                [
                    {
                        id: "test",
                        value: true,
                    },
                ],
                "signup"
            ),
            {
                user: "user-2",
                context: {
                    loginType: "emailpassword",
                    formFields: [
                        {
                            id: "test",
                            value: true,
                        },
                    ],
                },
                action: "signup",
            }
        );

        assert.deepStrictEqual(
            await thirdpartyemailpassword.thirdPartyRecipe.config.sessionFeature.setJwtPayload(
                "user-1",
                { code: "test" },
                "signin"
            ),
            {
                user: "user-1",
                context: {
                    loginType: "thirdparty",
                    thirdPartyAuthCodeResponse: {
                        code: "test",
                    },
                },
                action: "signin",
            }
        );
        assert.deepStrictEqual(
            await thirdpartyemailpassword.thirdPartyRecipe.config.sessionFeature.setSessionData(
                "user-2",
                { code: "test" },
                "signup"
            ),
            {
                user: "user-2",
                context: {
                    loginType: "thirdparty",
                    thirdPartyAuthCodeResponse: {
                        code: "test",
                    },
                },
                action: "signup",
            }
        );
    });
});
