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
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
let utils = require("../../lib/build/recipe/emailpassword/utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`configTest: ${printPath("[test/emailpassword/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test config for emailpassword module
    // Failure condition: passing custom data or data of invalid type/ syntax to the module
    it("test default config for emailpassword module", async function () {
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

        let resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature;

        assert(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length === 1);
        assert(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id === "email");
        assert(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length === 1);
        assert(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id === "password");

        let emailVerificationFeature = emailpassword.config.emailVerificationFeature;
    });

    // Failure condition: passing data of invalid type/ syntax to the module
    it("test config for emailpassword module", async function () {
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
                EmailPassword.init({
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

        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();

        let formFields = emailpassword.config.signUpFeature.formFields;
        assert(formFields.length === 3);

        let testFormField = await emailpassword.config.signUpFeature.formFields.filter((f) => f.id === "test")[0];
        assert(testFormField !== undefined);
        assert(testFormField.optional === false);
        assert(testFormField.validate("") === "test");
    });

    /*
     * test validateAndNormaliseUserInput for emailpassword
     *         - No email / passord validators given should add them
     *         - Giving optional true in email / password field should be ignored
     *         - Check that the default password and email validators work fine
     */
    it("test that no email/password validators given should add them", async function () {
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
