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

const { printPath, setupST, startST, killAllST, cleanST, signUPRequest, extractInfoFromResponse } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
const express = require("express");
const request = require("supertest");

describe(`signinFeature: ${printPath("[test/emailpassword/signinFeature.test.js]")}`, function () {
    describe("With default implementation enabled", function () {
        let app, signUpUserInfo;

        before(async function () {
            await killAllST();
            await setupST();
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            app = express();

            app.use(STExpress.middleware());

            app.use(STExpress.errorHandler());

            const signUPResponse = await signUPRequest(app, "random@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(signUPResponse.text).status, "OK");
            assert.deepStrictEqual(signUPResponse.status, 200);
            signUpUserInfo = JSON.parse(signUPResponse.text).user;
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        /*
         * test signInAPI for:
         *        - it works when the input is fine (sign up, and then sign in and check you get the user's info)
         *        - throws an error if the email does not match
         *        - throws an error if the password is incorrect
         */

        /*
        Failure condition:
        Setting  invalid email or password values in the request body when sending a request to /signin 
        */
        it("test singinAPI works when input is fine", async function () {
            const userInfo = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random@gmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text).user);
                        }
                    })
            );
            assert.deepStrictEqual(userInfo.id, signUpUserInfo.id);
            assert.deepStrictEqual(userInfo.email, signUpUserInfo.email);
        });

        /*
        Setting the email value in form field as random@gmail.com causes the test to fail
        */
        it("test singinAPI throws an error when email does not match", async function () {
            const invalidEmailResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "ran@gmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(invalidEmailResponse.status, "WRONG_CREDENTIALS_ERROR");
        });

        // throws an error if the password is incorrect
        /*
        passing the correct password "validpass123" causes the test to fail
        */
        it("test singinAPI throws an error if password is incorrect", async function () {
            const invalidPasswordResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass12345",
                            },
                            {
                                id: "email",
                                value: "random@gmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(invalidPasswordResponse.status, "WRONG_CREDENTIALS_ERROR");
        });

        /*
         * pass a bad input to the /signin API and test that it throws a 400 error.
         *        - Not a JSON
         *        - No POST body
         *        - Input is JSON, but wrong structure.
         */
        /*
        Failure condition:
        setting valid JSON body to /singin API
        */
        it("test bad input, not a JSON to /signin API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send("hello")
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(badInputResponse.message, "Missing input param: formFields");
        });

        /*
        Failure condition:
        setting valid formFields JSON body to /singin API
        */
        it("test bad input, no POST body to /signin API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(badInputResponse.message, "Missing input param: formFields");
        });

        /*
        Failure condition:
        setting valid JSON body to /singin API
        */
        it("test bad input, input is Json but incorrect structure to /signin API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        randomKey: "randomValue",
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(badInputResponse.message, "Missing input param: formFields");
        });

        // Make sure that a successful sign in yields a session
        /*
        Passing invalid credentials to the /signin API fails the test
        */
        it("test that a successfull signin yields a session", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random@gmail.com",
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

            let cookies = extractInfoFromResponse(response);
            assert.notDeepStrictEqual(cookies.accessToken, undefined);
            assert.notDeepStrictEqual(cookies.refreshToken, undefined);
            assert.notDeepStrictEqual(cookies.antiCsrf, undefined);
            assert.notDeepStrictEqual(cookies.idRefreshTokenFromHeader, undefined);
            assert.notDeepStrictEqual(cookies.idRefreshTokenFromCookie, undefined);
            assert.notDeepStrictEqual(cookies.accessTokenExpiry, undefined);
            assert.notDeepStrictEqual(cookies.refreshTokenExpiry, undefined);
            assert.notDeepStrictEqual(cookies.idRefreshTokenExpiry, undefined);
            assert.notDeepStrictEqual(cookies.refreshToken, undefined);
            assert.deepStrictEqual(cookies.accessTokenDomain, undefined);
            assert.deepStrictEqual(cookies.refreshTokenDomain, undefined);
            assert.deepStrictEqual(cookies.idRefreshTokenDomain, undefined);
            assert.notDeepStrictEqual(cookies.frontToken, undefined);
        });

        it("test email field validation error returns form field error", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "pwd",
                            },
                            {
                                id: "email",
                                value: "randomgmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                        }
                        resolve(JSON.parse(res.text));
                    })
            );
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields[0].error, "Email is invalid");
            assert.deepStrictEqual(response.formFields[0].id, "email");
        });

        it("test formFields has no email field returns error message", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                        }
                        resolve(JSON.parse(res.text));
                    })
            );
            assert.deepStrictEqual(response.message, "Are you sending too many / too few formFields?");
        });

        it("test input formFields has no password field returns error message", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "random@gmail.com",
                            },
                        ],
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                        }
                        resolve(JSON.parse(res.text));
                    })
            );
            assert.deepStrictEqual(response.message, "Are you sending too many / too few formFields?");
        });

        // Provide invalid (wrong syntax) email and wrong password, and you should get form field error
        /*
        passing email with valid syntax and correct password will cause the test to fail
        */
        it("test invalid email and wrong password", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "invalid",
                            },
                            {
                                id: "email",
                                value: "randomgmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                        }
                        resolve(JSON.parse(res.text));
                    })
            );
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields.length, 1);
            assert.deepStrictEqual(response.formFields[0].error, "Email is invalid");
            assert.deepStrictEqual(response.formFields[0].id, "email");
        });

        it("test getUserByEmail when user does exist/ does not exist", async function () {
            assert.deepStrictEqual(
                await EmailPasswordRecipe.getInstanceOrThrowError().getUserByEmail("random2@gmail.com"),
                undefined
            );
            const signUpResponse = await signUPRequest(app, "random2@gmail.com", "validpass123");
            const signUpUserInfo = JSON.parse(signUpResponse.text).user;
            const userInfo = await EmailPasswordRecipe.getInstanceOrThrowError().getUserByEmail("random2@gmail.com");

            assert.deepStrictEqual(userInfo.email, signUpUserInfo.email);
            assert.deepStrictEqual(userInfo.id, signUpUserInfo.id);
        });

        /*
         * Test getUserById
         *        - User does not exist
         *        - User exists
         */
        it("test getUserById when user does not exist", async function () {
            assert.deepStrictEqual(
                await EmailPasswordRecipe.getInstanceOrThrowError().getUserById("randomID"),
                undefined
            );

            const app = express();

            app.use(STExpress.middleware());

            app.use(STExpress.errorHandler());

            const signUpResponse = await signUPRequest(app, "random3@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(signUpResponse.text).status, "OK");
            assert.deepStrictEqual(signUpResponse.status, 200);

            const signUpUserInfo = JSON.parse(signUpResponse.text).user;
            const userInfo = await EmailPasswordRecipe.getInstanceOrThrowError().getUserById(signUpUserInfo.id);

            assert.deepStrictEqual(userInfo.email, signUpUserInfo.email);
            assert.deepStrictEqual(userInfo.id, signUpUserInfo.id);
        });
    });

    describe("With default implementation disabled", function () {
        let app;

        before(async function () {
            await killAllST();
            await setupST();
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
                        signInFeature: {
                            disableDefaultImplementation: true,
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();

            app.use(STExpress.middleware());

            app.use(STExpress.errorHandler());

            const signUPResponse = await signUPRequest(app, "random@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(signUPResponse.text).status, "OK");
            assert.deepStrictEqual(signUPResponse.status, 200);
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        /*
        Failure condition:
        Set  disableDefaultImplementation to false in the signInFeature
        */
        it("test that disableDefaultImplementation is true, the default signin API does not work", async function () {
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random@gmail.com",
                            },
                        ],
                    })
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(response.status, 404);
        });
    });

    describe("With custom validators", function () {
        let app;
        let failsPasswordValidatorCtr = 0;
        let passesPasswordValidatorCtr = 0;
        let passesEmailValidatorCtr = 0;
        let failsEmailValidatorCtr = 0;

        before(async function () {
            await killAllST();
            await setupST();
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
                        signUpFeature: {
                            formFields: [
                                {
                                    id: "email",
                                    validate: (value) => {
                                        if (value.startsWith("test")) {
                                            passesEmailValidatorCtr++;
                                            return undefined;
                                        }

                                        failsEmailValidatorCtr++;
                                        return "email does not start with test";
                                    },
                                },
                                {
                                    id: "password",
                                    validate: (value) => {
                                        if (value.length <= 5) {
                                            passesPasswordValidatorCtr++;
                                            return undefined;
                                        }
                                        failsPasswordValidatorCtr++;
                                        return "password is greater than 5 characters";
                                    },
                                },
                            ],
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();

            app.use(STExpress.middleware());

            app.use(STExpress.errorHandler());

            const signUPResponse = await signUPRequest(app, "testrandom@gmail.com", "pwd");
            assert.deepStrictEqual(JSON.parse(signUPResponse.text).status, "OK");
            assert.deepStrictEqual(signUPResponse.status, 200);
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        afterEach(async function () {
            failsPasswordValidatorCtr = 0;
            passesPasswordValidatorCtr = 0;
            passesEmailValidatorCtr = 0;
            failsEmailValidatorCtr = 0;
        });

        /*
         * formField validation testing:
         *        - Provide custom email validators to sign up and make sure they are applied to sign in
         *        - Provide custom password validators to sign up and make sure they are not applied to sign in.
         *        - Test password field validation error. The result should not be a FORM_FIELD_ERROR, but should be WRONG_CREDENTIALS_ERROR
         *        - Test email field validation error
         *        - Input formFields has no email field
         *        - Input formFields has no password field
         *        - Provide invalid (wrong syntax) email and wrong password, and you should get form field error
         */
        /*
        having the email start with "test" (requierment of the custom validator) will cause the test to fail
        */
        it("test custom email validators to sign up and make sure they are applied to sign in", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "pwd",
                            },
                            {
                                id: "email",
                                value: "random@gmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                        }
                        resolve(JSON.parse(res.text));
                    })
            );
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields[0].error, "email does not start with test");
            assert.deepStrictEqual(response.formFields[0].id, "email");
        });

        //- Provide custom password validators to sign up and make sure they are not applied to sign in.
        /*
        sending the correct password "valid" will cause the test to fail
        */
        it("test custom password validators to sign up and make sure they are applied to sign in", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "bad",
                            },
                            {
                                id: "email",
                                value: "testrandom@gmail.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                        }
                        resolve(JSON.parse(res.text));
                    })
            );

            assert.deepStrictEqual(response.status, "WRONG_CREDENTIALS_ERROR");

            // Email validation on sign in.
            assert.deepStrictEqual(failsEmailValidatorCtr, 0);
            assert.deepStrictEqual(passesEmailValidatorCtr, 1);

            // No password validation on sign in.
            assert.deepStrictEqual(failsPasswordValidatorCtr, 0);
            assert.deepStrictEqual(passesPasswordValidatorCtr, 0);
        });
    });
});
