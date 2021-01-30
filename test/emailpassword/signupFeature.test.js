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
const express = require("express");
const request = require("supertest");

describe(`signupFeature: ${printPath("[test/emailpassword/signupFeature.test.js]")}`, function () {
    describe("With default implementation enabled", function () {
        let app, customFormFieldsPostSignUp;

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
                            handleCustomFormFieldsPostSignUp: (user, formFields) => {
                                customFormFieldsPostSignUp = formFields;
                            },
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        afterEach(async function () {
            customFormFieldsPostSignUp = undefined;
        });

        /*
         * test signUpAPI for:
         *        - it works when the input is fine (sign up, get user id, get email of that user and check the input email is same as the one used for sign up)
         *        - throws an error in case of duplicate email.
         */

        it("test signUpAPI works when input is fine", async function () {
            const response = await signUPRequest(app, "random@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(response.text).status, "OK");
            assert.deepStrictEqual(response.status, 200);

            const userInfo = JSON.parse(response.text).user;
            assert.notDeepStrictEqual(userInfo.id, undefined);
            assert.deepStrictEqual(userInfo.email, "random@gmail.com");
        });

        it("test signUpAPI throws an error in case of a duplicate email", async function () {
            let response = await signUPRequest(app, "random2@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(response.text).status, "OK");
            assert.deepStrictEqual(response.status, 200);

            let userInfo = JSON.parse(response.text).user;
            assert.notDeepStrictEqual(userInfo.id, undefined);
            assert.deepStrictEqual(userInfo.email, "random2@gmail.com");

            response = await signUPRequest(app, "random2@gmail.com", "validpass123");
            assert.deepStrictEqual(response.status, 200);
            const responseInfo = JSON.parse(response.text);

            assert.deepStrictEqual(responseInfo.status, "FIELD_ERROR");
            assert.deepStrictEqual(responseInfo.formFields.length, 1);
            assert.deepStrictEqual(responseInfo.formFields[0].id, "email");
            assert.deepStrictEqual(
                responseInfo.formFields[0].error,
                "This email already exists. Please sign in instead."
            );
        });

        it("test signUpAPI throws an error for email and password with invalid syntax", async function () {
            const response = await signUPRequest(app, "randomgmail.com", "invalidpass");
            assert.deepStrictEqual(response.status, 200);
            const responseInfo = JSON.parse(response.text);

            assert.deepStrictEqual(responseInfo.status, "FIELD_ERROR");
            assert.deepStrictEqual(responseInfo.formFields.length, 2);
            assert.deepStrictEqual(
                responseInfo.formFields.filter((f) => f.id === "email")[0].error,
                "Email is invalid"
            );
            assert.deepStrictEqual(
                responseInfo.formFields.filter((f) => f.id === "password")[0].error,
                "Password must contain at least one number"
            );
        });

        /* pass a bad input to the /signup API and test that it throws a 400 error.
         *        - Not a JSON
         *        - No POST body
         *        - Input is JSON, but wrong structure.
         *        - formFields is not an array
         *        - formFields does not exist
         *        - formField elements have no id or no value field
         * */
        it("test bad input, not a JSON to /signup API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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

        it("test bad input, no POST body to /signup API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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

        it("test bad input, Input is JSON, but wrong structure to /signup API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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

        it("test bad input, formFields is not an array in /signup API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: {
                            randomKey: "randomValue",
                        },
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
            assert.deepStrictEqual(badInputResponse.message, "formFields must be an array");
        });

        it("test bad input, formField elements have no id or no value field in /signup API", async function () {
            const badInputResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                randomKey: "randomValue",
                            },
                            {
                                randomKey2: "randomValue2",
                            },
                        ],
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
            assert.deepStrictEqual(
                badInputResponse.message,
                "All elements of formFields must contain an 'id' and 'value' field"
            );
        });

        //* Make sure that a successful sign up yields a session
        it("test that a successful signup yields a session", async function () {
            const signUpResponse = await signUPRequest(app, "random3@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(signUpResponse.text).status, "OK");
            assert.deepStrictEqual(signUpResponse.status, 200);

            let cookies = extractInfoFromResponse(signUpResponse);
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

        //If provided by the user, and no custom fields are there, then the formFields param must sbe empty
        it("test that if provided by the user, and no custom fields are there, then formFields must be empty", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random5@gmail.com",
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

            assert.deepStrictEqual(response.status, "OK");
            assert.deepStrictEqual(customFormFieldsPostSignUp.length, 0);
        });

        //- Input formFields has no email field (and not in config)
        it("test input formFields has no email field", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(response.message, "Are you sending too many / too few formFields?");
        });

        // Input formFields has no password field (and not in config
        it("test inut formFields has no password field", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(response.message, "Are you sending too many / too few formFields?");
        });

        it("test signup password field validation error", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "invalid",
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
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields.length, 1);
            assert.deepStrictEqual(
                response.formFields[0].error,
                "Password must contain at least 8 characters, including a number"
            );
            assert.deepStrictEqual(response.formFields[0].id, "password");
        });

        //Test email field validation error
        it("test signup email field validation error", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
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
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields.length, 1);
            assert.deepStrictEqual(response.formFields[0].error, "Email is invalid");
            assert.deepStrictEqual(response.formFields[0].id, "email");
        });

        //Make sure that the input email is trimmed
        it("test that input email is trimmed", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "      random10213@gmail.com    ",
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
            assert.deepStrictEqual(response.status, "OK");
            assert.notDeepStrictEqual(response.user.id, undefined);
            assert.deepStrictEqual(response.user.email, "random10213@gmail.com");
        });
    });

    describe("With custom form fields", function () {
        let app, customFormFieldsPostSignUp;

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
                                    id: "testField",
                                },
                            ],
                            handleCustomFormFieldsPostSignUp: (user, formFields) => {
                                customFormFieldsPostSignUp = formFields;
                            },
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        afterEach(async function () {
            customFormFieldsPostSignUp = undefined;
        });

        /*
         * providing the handleCustomFormFieldsPostSignUp should work:
         *        - If not provided by the user, it should not result in an error
         *        - If provided by the user, and custom fields are there, those should be sent
         *        - If provided by the user, and no custom fields are there, then the formFields param must sbe empty
         */

        //If not provided by the user, it should not result in an error
        it("test that if not provided by the user, it should not result in an error", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            {
                                id: "testField",
                                value: "testValue",
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

            assert.deepStrictEqual(response.status, "OK");
            assert.notDeepStrictEqual(response.user.id, undefined);
            assert.deepStrictEqual(response.user.email, "random@gmail.com");
        });

        //- If provided by the user, and custom fields are there, those should be sent
        it("test that if provided by the user, and custom fields are there, those are sent", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random@2gmail.com",
                            },
                            {
                                id: "testField",
                                value: "testValue",
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

            assert.deepStrictEqual(response.status, "OK");
            assert.deepStrictEqual(customFormFieldsPostSignUp.length, 1);
            assert.deepStrictEqual(customFormFieldsPostSignUp[0].id, "testField");
            assert.deepStrictEqual(customFormFieldsPostSignUp[0].value, "testValue");
        });

        it("test formFields added in config but not in inout to signup, check error about it being missing", async function () {
            const response = await signUPRequest(app, "random@gmail.com", "validpass123");
            assert.deepStrictEqual(response.status, 400);
            assert.deepStrictEqual(JSON.parse(response.text).message, "Are you sending too many / too few formFields?");
        });

        //- Good test case without optional
        it("test valid formFields without optional", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random5@gmail.com",
                            },
                            {
                                id: "testField",
                                value: "testValue",
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

            assert.deepStrictEqual(response.status, "OK");
            assert.notDeepStrictEqual(response.user.id, undefined);
            assert.deepStrictEqual(response.user.email, "random5@gmail.com");
        });

        //- Bad test case without optional (something is missing, and it's not optional)
        it("test bad case input to signup without optional", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            {
                                id: "testField",
                                value: "",
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
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields.length, 1);
            assert.deepStrictEqual(response.formFields[0].error, "Field is not optional");
            assert.deepStrictEqual(response.formFields[0].id, "testField");
        });

        // Pass a non string value in the formFields array and make sure it passes through the signUp API and is sent in the handleCustomFormFieldsPostSignUp as that type
        it("test that non string value in formFields array and it passes through the signup API and it is sent to the handleCustomFormFieldsPostSignUp", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random1423@gmail.com",
                            },
                            {
                                id: "testField",
                                value: { key: "value" },
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
            assert.deepStrictEqual(response.status, "OK");
            assert.deepStrictEqual(customFormFieldsPostSignUp.length, 1);
            assert.deepStrictEqual(customFormFieldsPostSignUp[0].id, "testField");
            assert.deepStrictEqual(customFormFieldsPostSignUp[0].value.key, "value");
        });
    });

    /* formField validation testing:
     *        - Provide formFields in config but not in input to signup and see error about it being missing
     *        - Good test case without optional
     *        - Bad test case without optional (something is missing, and it's not optional)
     *        - Good test case with optionals
     *        - Input formFields has no email field (and not in config)
     *        - Input formFields has no password field (and not in config
     *        - Input form field has different number of custom fields than in config form fields)
     *        - Input form field has same number of custom fields as in config form field, but some ids mismatch
     *        - Test custom field validation error (one and two custom fields)
     *        - Test password field validation error
     *        - Test email field validation error
     *        - Make sure that the input email is trimmed
     *        - Pass a non string value in the formFields array and make sure it passes through the signUp API and is sent in the handleCustomFormFieldsPostSignUp as that type
     */

    describe("With optional custom form fields", function () {
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
                        signUpFeature: {
                            formFields: [
                                {
                                    id: "testField",
                                    optional: true,
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
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test good case input to signup with optional", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random6@gmail.com",
                            },
                            {
                                id: "testField",
                                value: "",
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

            assert.deepStrictEqual(response.status, "OK");
            assert.notDeepStrictEqual(response.user.id, undefined);
            assert.deepStrictEqual(response.user.email, "random6@gmail.com");
        });
    });

    describe("With one optional and one required custom form fields", function () {
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
                        signUpFeature: {
                            formFields: [
                                {
                                    id: "testField",
                                    optional: true,
                                    validate: (value) => {
                                        if (value.length > 0 && value.length <= 5) {
                                            return "testField validation error";
                                        }
                                    },
                                },
                                {
                                    id: "testField2",
                                    validate: (value) => {
                                        if (value.length <= 5) {
                                            return "testField2 validation error";
                                        }
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
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test input form field has a different number of custom fields than in config form fields", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            {
                                id: "testField",
                                value: "",
                            },
                        ],
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
            assert.deepStrictEqual(response.message, "Are you sending too many / too few formFields?");
        });

        // Input form field has same number of custom fields as in config form field, but some ids mismatch
        it("test input form field has the same number of custom fields than in config form fields, but ids mismatch", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            {
                                id: "testField",
                                value: "",
                            },
                            {
                                id: "testField3",
                                value: "",
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

            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields.length, 1);
            assert.deepStrictEqual(response.formFields[0].error, "Field is not optional");
            assert.deepStrictEqual(response.formFields[0].id, "testField2");
        });

        // Test custom field validation error (one and two custom fields)
        it("test custom field validation error", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
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
                            {
                                id: "testField",
                                value: "test",
                            },
                            {
                                id: "testField2",
                                value: "test",
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
            assert.deepStrictEqual(response.status, "FIELD_ERROR");
            assert.deepStrictEqual(response.formFields.length, 2);
            assert.deepStrictEqual(
                response.formFields.filter((f) => f.id === "testField")[0].error,
                "testField validation error"
            );
            assert.deepStrictEqual(
                response.formFields.filter((f) => f.id === "testField2")[0].error,
                "testField2 validation error"
            );
        });
    });

    describe("With one optional and one required custom form fields", function () {
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
                        signUpFeature: {
                            disableDefaultImplementation: true,
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        // * check if disableDefaultImplementation is true, the default signup API does not work - you get a 404
        it("test that if disableDefaultImplementation is true, the default signup API does not work", async function () {
            const response = await signUPRequest(app, "random@gmail.com", "validpass123");
            assert.deepStrictEqual(response.status, 404);
        });
    });
});
