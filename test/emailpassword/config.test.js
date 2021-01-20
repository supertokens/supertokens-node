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
const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const STExpress = require("../../");
const SessionRecipe = require("../../lib/build/recipe/session/sessionRecipe").default;
const assert = require("assert");
const { ProcessState } = require("../../lib/build/processState");
const EmailPassword = require("../../recipe/emailpassword");
const SuperTokens = require("../../lib/build/supertokens").default;
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;

describe(`configTest: ${printPath("[test/emailpassword/config.test.js]")}`, function () {
    before(async function () {
        await killAllST();
        await setupST();
        await startST();
    });

    beforeEach(async function () {
        ProcessState.getInstance().reset();
        SuperTokens.reset();
        SessionRecipe.reset();
        EmailPasswordRecipe.reset();
    });
    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test config for emailpassword module
    // Failure condition: passing custom data or data of invalid type/ syntax to the module
    it("test default config for emailpassword module", async function () {
        STExpress.init({
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

        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();

        let signUpFeature = emailpassword.config.signUpFeature;
        assert(signUpFeature.formFields.length === 2);
        assert(signUpFeature.formFields.filter((f) => f.id === "email")[0].optional === false);
        assert(signUpFeature.formFields.filter((f) => f.id === "password")[0].optional === false);
        assert(signUpFeature.formFields.filter((f) => f.id === "email")[0].validate !== undefined);
        assert(signUpFeature.formFields.filter((f) => f.id === "password")[0].validate !== undefined);

        let signInFeature = emailpassword.config.signInFeature;
        assert(signInFeature.formFields.length === 2);
        assert(signInFeature.formFields.filter((f) => f.id === "email")[0].optional === false);
        assert(signInFeature.formFields.filter((f) => f.id === "password")[0].optional === false);
        assert(signInFeature.formFields.filter((f) => f.id === "email")[0].validate !== undefined);
        assert(signInFeature.formFields.filter((f) => f.id === "password")[0].validate !== undefined);

        assert(emailpassword.config.signOutFeature.disableDefaultImplementation === false);

        let resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature;

        assert(resetPasswordUsingTokenFeature.disableDefaultImplementation === false);
        assert(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length === 1);
        assert(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id === "email");
        assert(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length === 1);
        assert(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id === "password");

        let emailVerificationFeature = emailpassword.config.emailVerificationFeature;

        assert(emailVerificationFeature.disableDefaultImplementation === false);
    });

    // Failure condition: passing data of invalid type/ syntax to the module
    it("test config for emailpassword module", async function () {
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
                EmailPassword.init({
                    signInFeature: {
                        disableDefaultImplementation: true,
                    },
                    resetPasswordUsingTokenFeature: {
                        disableDefaultImplementation: true,
                    },
                    signOutFeature: {
                        disableDefaultImplementation: true,
                    },
                    signUpFeature: {
                        formFields: [
                            {
                                id: "test",
                                optional: false,
                                validate: (value) => {
                                    return value + "test";
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        const emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();

        const formFields = emailpassword.config.signUpFeature.formFields;
        assert.deepStrictEqual(formFields.length, 3);

        const testFormField = await emailpassword.config.signUpFeature.formFields.filter((f) => f.id === "test")[0];
        assert(testFormField !== undefined);
        assert(testFormField.optional === false);
        assert(testFormField.validate("") === "test");

        assert(emailpassword.config.signInFeature.disableDefaultImplementation);
        assert(emailpassword.config.resetPasswordUsingTokenFeature.disableDefaultImplementation);
        assert(emailpassword.config.signOutFeature.disableDefaultImplementation);
    });

    /*
     * test validateAndNormaliseUserInput for emailpassword
     *         - No email / passord validators given should add them
     *         - Giving optional true in email / password field should be ignored
     *         - Check that the default password and email validators work fine
     */
    it("test that no email/password validators given should add them", async function () {
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
                EmailPassword.init({
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                            },
                            {
                                id: "password",
                            },
                        ],
                    },
                }),
            ],
        });

        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();
        assert(emailpassword.config.signUpFeature.formFields[0].validate !== undefined);
        assert(emailpassword.config.signUpFeature.formFields[1].validate !== undefined);
    });

    it("test that giving optional true in email / password field should be ignored", async function () {
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
                EmailPassword.init({
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                                optional: true,
                            },
                            {
                                id: "password",
                                optional: true,
                            },
                        ],
                    },
                }),
            ],
        });

        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();
        assert(!emailpassword.config.signUpFeature.formFields[0].optional);
        assert(!emailpassword.config.signUpFeature.formFields[1].optional);
    });

    //Check that the default password and email validators work fine
    it("test that default password and email validators work fine", async function () {
        STExpress.init({
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

        let formFields = await EmailPasswordRecipe.getInstanceOrThrowError().config.signUpFeature.formFields;

        let defaultEmailValidator = formFields.filter((f) => f.id === "email")[0].validate;
        assert((await defaultEmailValidator("aaaaa")) === "Email is invalid");
        assert((await defaultEmailValidator("aaaaaa@aaaaaa")) === "Email is invalid");
        assert((await defaultEmailValidator("random  User   @randomMail.com")) === "Email is invalid");
        assert((await defaultEmailValidator("*@*")) === "Email is invalid");
        assert((await defaultEmailValidator("validmail@gmail.com")) === undefined);
        assert((await defaultEmailValidator()) === "Development bug: Please make sure the email field yields a string");

        let defaultPasswordValidator = formFields.filter((f) => f.id === "password")[0].validate;
        assert(
            (await defaultPasswordValidator("aaaaa")) ===
                "Password must contain at least 8 characters, including a number"
        );
        assert((await defaultPasswordValidator("aaaaaaaaa")) === "Password must contain at least one number");
        assert((await defaultPasswordValidator("1234*-56*789")) === "Password must contain at least one alphabet");
        assert((await defaultPasswordValidator("validPass123")) === undefined);
        assert(
            (await defaultPasswordValidator()) ===
                "Development bug: Please make sure the password field yields a string"
        );
    });
});
