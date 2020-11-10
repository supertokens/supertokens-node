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
let utils = require("../../lib/build/recipe/emailpassword/utils");
const express = require("express");
const request = require("supertest");
const { default: NormalisedURLPath } = require("../../lib/build/normalisedURLPath");

/**
 * TODO: check if disableDefaultImplementation is true, the default signin API does not work - you get a 404
 * TODO: test signInAPI for:
 *        - it works when the input is fine (sign up, and then sign in and check you get the user's info)
 *        - throws an error if the email does not match
 *        - throws an error if the password is incorrect
 * TODO: pass a bad input to the /signin API and test that it throws a 400 error.
 *        - Not a JSON
 *        - No POST body
 *        - Input is JSON, but wrong structure.
 * TODO: Make sure that a successful sign in yields a session
 * TODO: formField validation testing:
 *        - Provide custom email validators to sign up and make sure they are applied to sign in
 *        - Provide custom password validators to sign up and make sure they are applied to sign in. The result should not be a FORM_FIELD_ERROR, but should be WRONG_CREDENTIALS_ERROR
 *        - Test password field validation error. The result should not be a FORM_FIELD_ERROR, but should be WRONG_CREDENTIALS_ERROR
 *        - Test email field validation error
 *        - Input formFields has no email field
 *        - Input formFields has no password field
 *        - Provide invalid (wrong syntax) email and wrong password, and you should get form field error
 * TODO: Test getUserByEmail
 *        - User does not exist
 *        - User exists
 * TODO: Test getUserById
 *        - User does not exist
 *        - User exists
 */

describe(`signinFeature: ${printPath("[test/signinFeature.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // TODO: check if disableDefaultImplementation is true, the default signin API does not work - you get a 404
    /*
    Failure condition:
        EmailPassword.init({
            signInFeature: {
                disableDefaultImplementation: true,
            },
        })
    */
    it("test that disableDefaultImplementation is true, the default signin API does not work", async function () {
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
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

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
        assert(response.status === 404);
    });

    /*
     * TODO: test signInAPI for:
     *        - it works when the input is fine (sign up, and then sign in and check you get the user's info)
     *        - throws an error if the email does not match
     *        - throws an error if the password is incorrect
     */
    /*
    Failure condition:
    Setting  invalid email or password values in the request body when sending a request to /signin 
    */
    it("test singinAPI works when input is fine", async function () {
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

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await new Promise((resolve) =>
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
                        resolve(res);
                    }
                })
        );

        let userInfo = await new Promise((resolve) =>
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
        assert(userInfo.id !== undefined);
        assert(userInfo.email === "random@gmail.com");
    });

    /*
    Setting the email value in form field as random@gmail.com causes the test to fail
    */
    it("test singinAPI throws an error when email does not match", async function () {
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

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await new Promise((resolve) =>
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
                        resolve(res);
                    }
                })
        );

        let invalidEmailResponse = await new Promise((resolve) =>
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
        assert(invalidEmailResponse.status === "WRONG_CREDENTIALS_ERROR");
    });
    /*
    passing the correct password "validpass123" causes the test to fail
    */
    it("test singinAPI throws an error if password is incorrect", async function () {
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

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await new Promise((resolve) =>
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
                        resolve(res);
                    }
                })
        );

        let invalidPasswordResponse = await new Promise((resolve) =>
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
        assert(invalidPasswordResponse.status === "WRONG_CREDENTIALS_ERROR");
    });

    /*
     * TODO: pass a bad input to the /signin API and test that it throws a 400 error.
     *        - Not a JSON
     *        - No POST body
     *        - Input is JSON, but wrong structure.
     */
    /*
    Failure condition:
    setting valid JSON body to /singin API
    .send({
        formFields: [
            {
                d: "password",
                value: "validpass123",
            },
            {
                id: "email",
                value: "random@gmail.com",
            },
        ],
    })
    */
    it("test bad input, not a JSON to /signin API", async function () {
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

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await new Promise((resolve) =>
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
                        resolve(res);
                    }
                })
        );

        let badInputResponse = await new Promise((resolve) =>
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
        assert(badInputResponse.message === "Missing input param: formFields");
    });

    /*
    Failure condition:
    setting valid JSON body to /singin API
    .send({
        formFields: [
            {
                d: "password",
                value: "validpass123",
            },
            {
                id: "email",
                value: "random@gmail.com",
            },
        ],
    })
    */
    it("test bad input, no POST body to /signin API", async function () {
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

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await new Promise((resolve) =>
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
                        resolve(res);
                    }
                })
        );

        let badInputResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        console.log(err);
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );
        assert(badInputResponse.message === "Missing input param: formFields");
    });

    /*
    Failure condition:
    setting valid JSON body to /singin API
    .send({
        formFields: [
            {
                d: "password",
                value: "validpass123",
            },
            {
                id: "email",
                value: "random@gmail.com",
            },
        ],
    })
    */
    it("test bad input, input is Json but incorrect structure to /signin API", async function () {
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
        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await new Promise((resolve) =>
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
                        resolve(res);
                    }
                })
        );

        let badInputResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    randomKey: "randomValue",
                })
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        console.log(err);
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );
        assert(badInputResponse.message === "Missing input param: formFields");
    });
});
