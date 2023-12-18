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
    signUPRequest,
    extractInfoFromResponse,
} = require("../utils");
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
const express = require("express");
const request = require("supertest");
const { default: NormalisedURLPath } = require("../../lib/build/normalisedURLPath");
let { middleware, errorHandler } = require("../../framework/express");

describe(`signupFeature: ${printPath("[test/emailpassword/signupFeature.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // * check if disable api, the default signup API does not work - you get a 404
    it("test that if disable api, the default signup API does not work", async function () {
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
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signUpPOST: undefined,
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 404);
    });

    /*
     * test signUpAPI for:
     *        - it works when the input is fine (sign up, get user id, get email of that user and check the input email is same as the one used for sign up)
     *        - throws an error in case of duplicate email.
     */

    it("test signUpAPI works when input is fine", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert(userInfo.emails[0] === "random@gmail.com");
    });

    it("test signUpAPI throws an error in case of a duplicate email", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert(userInfo.emails[0] === "random@gmail.com");

        response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 200);
        let responseInfo = JSON.parse(response.text);

        assert(responseInfo.status === "FIELD_ERROR");
        assert(responseInfo.formFields.length === 1);
        assert(responseInfo.formFields[0].id === "email");
        assert(responseInfo.formFields[0].error === "This email already exists. Please sign in instead.");
    });

    it("test signUpAPI throws an error for email and password with invalid syntax", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "randomgmail.com", "invalidpass");
        assert(response.status === 200);
        let responseInfo = JSON.parse(response.text);

        assert(responseInfo.status === "FIELD_ERROR");
        assert(responseInfo.formFields.length === 2);
        assert(responseInfo.formFields.filter((f) => f.id === "email")[0].error === "Email is invalid");
        assert(
            responseInfo.formFields.filter((f) => f.id === "password")[0].error ===
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let badInputResponse = await new Promise((resolve) =>
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
        assert.strictEqual(
            badInputResponse.message,
            "API input error: Please make sure to pass a valid JSON input in the request body"
        );
    });

    it("test bad input, no POST body to /signup API", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let badInputResponse = await new Promise((resolve) =>
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
        assert.strictEqual(badInputResponse.message, "Missing input param: formFields");
    });

    it("test bad input, Input is JSON, but wrong structure to /signup API", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let badInputResponse = await new Promise((resolve) =>
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
        assert.strictEqual(badInputResponse.message, "Missing input param: formFields");
    });

    it("test bad input, formFields is not an array in /signup API", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let badInputResponse = await new Promise((resolve) =>
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
        assert(badInputResponse.message === "formFields must be an array");
    });

    it("test bad input, formField elements have no id or no value field in /signup API", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let badInputResponse = await new Promise((resolve) =>
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
        assert(badInputResponse.message === "All elements of formFields must contain an 'id' and 'value' field");
    });

    //* Make sure that a successful sign up yields a session
    it("test that a successful signup yields a session", async function () {
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(signUpResponse.text).status === "OK");
        assert(signUpResponse.status === 200);

        let cookies = extractInfoFromResponse(signUpResponse);
        assert(cookies.accessToken !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.antiCsrf !== undefined);
        assert(cookies.accessTokenExpiry !== undefined);
        assert(cookies.refreshTokenExpiry !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
        assert(cookies.frontToken !== undefined);
    });

    /*
     * providing the handlePostSignup should work:
     *        - If not provided by the user, it should not result in an error
     *        - If provided by the user, and custom fields are there, only those should be sent
     *        - If provided by the user, and no custom fields are there, then the formFields param must sbe empty
     */

    //If not provided by the user, it should not result in an error

    it("test that if not provided by the user, it should not result in an error", async function () {
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
                                id: "testField",
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

        assert(response.status === "OK");
        assert(response.user.id !== undefined);
        assert(response.user.emails[0] === "random@gmail.com");
    });

    //- If provided by the user, and custom fields are there, only those should be sent
    it("test that if provided by the user, and custom fields are there, only those are sent, using handlePostSignUp", async function () {
        const connectionURI = await startST();

        let customFormFields = "";
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
                                id: "testField",
                            },
                        ],
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signUpPOST: async (input) => {
                                    let response = await oI.signUpPOST(input);
                                    if (response.status === "OK") {
                                        customFormFields = input.formFields;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

        assert(response.status === "OK");
        assert(customFormFields.length === 3);
        assert(customFormFields[0].id === "password");
        assert(customFormFields[0].value === "validpass123");
        assert(customFormFields[1].id === "email");
        assert(customFormFields[1].value === "random@gmail.com");
        assert(customFormFields[2].id === "testField");
        assert(customFormFields[2].value === "testValue");
    });

    //If provided by the user, and no custom fields are there, then the formFields param must sbe empty
    it("test that if provided by the user, and no custom fields are there, then formFields must be empty, using handlePostSignUp", async function () {
        const connectionURI = await startST();

        let customFormFields = "";
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
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signUpPOST: async (input) => {
                                    let response = await oI.signUpPOST(input);
                                    if (response.status === "OK") {
                                        customFormFields = input.formFields;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

        assert(response.status === "OK");
        assert(customFormFields.length === 2);
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
     *        - Pass a non string value in the formFields array and make sure it passes through the signUp API and is sent in the handlePostSignup as that type
     */
    it("test formFields added in config but not in inout to signup, check error about it being missing", async function () {
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
                                id: "testField",
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 400);

        assert(JSON.parse(response.text).message === "Are you sending too many / too few formFields?");
    });

    //- Good test case without optional
    it("test valid formFields without optional", async function () {
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
                                id: "testField",
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

        assert(response.status === "OK");
        assert(response.user.id !== undefined);
        assert(response.user.emails[0] === "random@gmail.com");
    });

    //- Bad test case without optional (something is missing, and it's not optional)
    it("test bad case input to signup without optional", async function () {
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
                                id: "testField",
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.status === "FIELD_ERROR");
        assert(response.formFields.length === 1);
        assert(response.formFields[0].error === "Field is not optional");
        assert(response.formFields[0].id === "testField");
    });

    //- Good test case with optionals
    it("test good case input to signup with optional", async function () {
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
                                id: "testField",
                                optional: true,
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

        assert(response.status === "OK");
        assert(response.user.id !== undefined);
        assert(response.user.emails[0] === "random@gmail.com");
    });

    //- Input formFields has no email field (and not in config)
    it("test input formFields has no email field", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.message === "Are you sending too many / too few formFields?");
    });

    // Input formFields has no password field (and not in config
    it("test inut formFields has no password field", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.message === "Are you sending too many / too few formFields?");
    });

    // Input form field has different number of custom fields than in config form fields)
    it("test input form field has a different number of custom fields than in config form fields", async function () {
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
                                id: "testField",
                                optional: true,
                            },
                            {
                                id: "testField2",
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.message === "Are you sending too many / too few formFields?");
    });

    // Input form field has same number of custom fields as in config form field, but some ids mismatch
    it("test input form field has the same number of custom fields than in config form fields, but ids mismatch", async function () {
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
                                id: "testField",
                                optional: true,
                            },
                            {
                                id: "testField2",
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

        assert(response.status === "FIELD_ERROR");
        assert(response.formFields.length === 1);
        assert(response.formFields[0].error === "Field is not optional");
        assert(response.formFields[0].id === "testField2");
    });

    // Test custom field validation error (one and two custom fields)
    it("test custom field validation error", async function () {
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
                                id: "testField",
                                validate: (value) => {
                                    if (value.length <= 5) {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.status === "FIELD_ERROR");
        assert(response.formFields.length === 2);
        assert(response.formFields.filter((f) => f.id === "testField")[0].error === "testField validation error");
        assert(response.formFields.filter((f) => f.id === "testField2")[0].error === "testField2 validation error");
    });

    //Test password field validation error
    it("test signup password field validation error", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.status === "FIELD_ERROR");
        assert(response.formFields.length === 1);
        assert(response.formFields[0].error === "Password must contain at least 8 characters, including a number");
        assert(response.formFields[0].id === "password");
    });

    //Test email field validation error
    it("test signup email field validation error", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.status === "FIELD_ERROR");
        assert(response.formFields.length === 1);
        assert(response.formFields[0].error === "Email is invalid");
        assert(response.formFields[0].id === "email");
    });

    //Make sure that the input email is trimmed
    it("test that input email is trimmed", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
                            value: "      random@gmail.com    ",
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
        assert(response.status === "OK");
        assert(response.user.id !== undefined);
        assert(response.user.emails[0] === "random@gmail.com");
    });

    // Pass a non string value in the formFields array and make sure it passes through the signUp API and is sent in the handlePostSignUp as that type
    it("test that non string value in formFields array and it passes through the signup API and it is sent to the handlePostSignUp", async function () {
        const connectionURI = await startST();

        let customFormFields = "";
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
                                id: "testField",
                            },
                        ],
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signUpPOST: async (input) => {
                                    let response = await oI.signUpPOST(input);
                                    if (response.status === "OK") {
                                        customFormFields = input.formFields;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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
        assert(response.status === "OK");
        assert(customFormFields.length === 3);
        assert(customFormFields[2].id === "testField");
        assert(customFormFields[2].value.key === "value");
    });

    it("test signUpAPI validate function using userContext", async function () {
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
                                id: "abc",
                                validate: async (value, tenantId, userContext) => {
                                    let request = STExpress.getRequestFromUserContext(userContext);
                                    if (request !== undefined) {
                                        let body = await request.getJSONBody();
                                        let passwordValue = body.formFields.find((f) => f.id === "password").value;
                                        if (passwordValue === "password1234") {
                                            return "error msg";
                                        }
                                    }
                                    return undefined;
                                },
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise(function (resolve) {
            request(app)
                .post("/auth/signup")
                .set("st-auth-mode", "cookie")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "password1234",
                        },
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                        {
                            id: "abc",
                            value: "test",
                        },
                    ],
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });
        assert(JSON.parse(response.text).status === "FIELD_ERROR");
        assert(JSON.parse(response.text).formFields[0].error === "error msg");
        assert(response.status === 200);
    });
});
