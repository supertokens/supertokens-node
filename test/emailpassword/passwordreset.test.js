/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
let SessionRecipe = require("../../lib/build/recipe/session/sessionRecipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
let generatePasswordResetToken = require("../../lib/build/recipe/emailpassword/api/generatePasswordResetToken").default;
let passwordReset = require("../../lib/build/recipe/emailpassword/api/passwordReset").default;
const express = require("express");
const request = require("supertest");

/**
 * TODO: (later) in passwordResetFunctions.ts:
 *        - (later) check that getResetPasswordURL works fine
 *        - (later) check that createAndSendCustomEmail works fine
 * TODO: generate token API:
 *        - (later) Call the createResetPasswordToken function with valid input
 *        - (later) Call the createResetPasswordToken with unknown userId and test error thrown
 *        - email validation checks (done)
 *        - check that the generated password reset link is correct (done)
 * TODO: password reset API:
 *        - (later) Call the resetPasswordUsingToken function with valid input
 *        - (later) Call the resetPasswordUsingToken with an invalid token and see the error
 *        - password validation checks (done)
 *        - token is missing from input (done)
 *        - (later) token is not of type string from input
 *        - invalid token in input (done)
 *        - input is valid, check that password has changed (call sign in) (done)
 */

describe(`passwordreset: ${printPath("[test/passwordreset.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    /*
     *  TODO: generate token API:
     *      - email validation checks
     *      - non existent email should return "OK" with a pause > 300MS
     *      - check that the generated password reset link is correct
     */
    it("test email validation checks in generate token API", async function () {
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
            recipeList: [EmailPassword.init()],
        });
        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset/token")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "random",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.body.status === "FIELD_ERROR");
        assert(response.body.formFields.length === 1);
        assert(response.body.formFields[0].error === "Email is invalid");
        assert(response.body.formFields[0].id === "email");
    });

    it("test that generated password link is correct", async function () {
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
                EmailPassword.init({
                    resetPasswordUsingTokenFeature: {
                        createAndSendCustomEmail: (user, passwordResetURLWithToken) => {
                            let resetURL = passwordResetURLWithToken.split("?")[0];
                            let tokenInfo = passwordResetURLWithToken.split("?")[1].split("&")[0];
                            let ridInfo = passwordResetURLWithToken.split("?")[1].split("&")[1];
                            assert(resetURL === "https://supertokens.io/auth/reset-password");
                            assert(tokenInfo.startsWith("token="));
                            assert(ridInfo.startsWith("rid=emailpassword"));
                        },
                    },
                }),
            ],
        });
        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();
        const app = express();

        app.use(STExpress.middleware());

        await emailpassword.signUp("random@gmail.com", "testpass");

        app.post("/reset-password", async (req, res) => {
            req.body = {
                formFields: [
                    {
                        id: "email",
                        value: "random@gmail.com",
                        validate: (value) => {
                            return value;
                        },
                    },
                ],
            };
            await generatePasswordResetToken(emailpassword, req, res);
        });
        await new Promise((resolve) =>
            request(app)
                .post("/reset-password")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
    });

    /*
     * TODO: password reset API:
     *        - password validation checks
     *        - token is missing from input
     *        - invalid token in input
     *        - input is valid, check that password has changed (call sign in)
     */
    it("test password validation", async function () {
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
            recipeList: [EmailPassword.init()],
        });
        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();
        const app = express();

        app.use(STExpress.middleware());

        app.post("/reset-password-invalid-password", async (req, res) => {
            req.body = {
                formFields: [
                    {
                        id: "password",
                        value: "random",
                        validate: (value) => {
                            return value;
                        },
                    },
                ],
            };

            try {
                await passwordReset(emailpassword, req, res);
                res.status(200).send("Incorrect response");
            } catch (err) {
                res.status(200).send(err);
            }
        });

        app.post("/reset-password-valid-password", async (req, res) => {
            req.body = {
                formFields: [
                    {
                        id: "password",
                        value: "random123",
                        validate: (value) => {
                            return value;
                        },
                    },
                ],
            };

            try {
                await passwordReset(emailpassword, req, res);
                res.status(200).send("Incorrect response");
            } catch (err) {
                res.status(200).send(err);
            }
        });

        let response = await new Promise((resolve) =>
            request(app)
                .post("/reset-password-valid-password")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.type);
                    }
                })
        );
        assert(response !== "FIELD_ERROR");
    });

    it("test token missing from input", async function () {
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
            recipeList: [EmailPassword.init()],
        });
        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();
        try {
            await emailpassword.resetPasswordUsingToken(undefined, "newpass");
        } catch (error) {
            assert(error.message.includes("status code: 400 and message: Field name 'token' is invalid in JSON input"));
        }
    });

    it("test invalid token input", async function () {
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
            recipeList: [EmailPassword.init()],
        });
        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();
        try {
            await emailpassword.resetPasswordUsingToken("invalidToken", "newpass");
            assert(false);
        } catch (error) {
            assert(error.type === "RESET_PASSWORD_INVALID_TOKEN_ERROR");
        }
    });

    it("test valid token input and passoword has changed", async function () {
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
            recipeList: [EmailPassword.init()],
        });
        let emailpassword = await EmailPasswordRecipe.getInstanceOrThrowError();

        let userID = await emailpassword.signUp("test@gmail.com", "testPass");

        let resetToken = await emailpassword.createResetPasswordToken(userID.id);

        await emailpassword.resetPasswordUsingToken(resetToken, "testPass1");

        try {
            await emailpassword.signIn("test@gmail.com", "testPass");
            assert(false);
        } catch (err) {
            if (err.type !== "WRONG_CREDENTIALS_ERROR") {
                throw err;
            }
        }

        await emailpassword.signIn("test@gmail.com", "testPass1");
    });
});
