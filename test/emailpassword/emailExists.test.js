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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll, signUPRequest } = require("../utils");
let STExpress = require("../../lib/build/").default;
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
const request = require("supertest");
const express = require("express");
let bodyParser = require("body-parser");

/*
TODO:

- Check good input, 
   - email exists
   - email does not exist
   - pass an invalid (syntactically) email and check that you get exists: false
   - pass an unnormalised email, and check that you get exists true
- Check bad input:
   - do not pass email
   - pass an array instead of string in the email
*/
describe(`emailExists: ${printPath("[test/emailpassword/emailExists.test.js]")}`, function () {
    describe(`With default implementation disabled`, function () {
        let app;

        before(async function () {
            await killAllST();
            await setupST();
            await startST();
            app = express();

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

        // disable the email exists API, and check that calling it returns a 404.
        it("test that if disableDefaultImplementation is true, the default email exists API does not work", async function () {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "random@gmail.com",
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
    });

    describe(`With Default Implementation enabled`, function () {
        let app;

        before(async function () {
            await killAllST();
            await setupST();
            await startST();
            app = express();

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
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());

            // Sign up.
            const signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
            assert(signUpResponse.status === 200);
            assert(JSON.parse(signUpResponse.text).status === "OK");
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test good input, email exists", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "random@gmail.com",
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

            assert(Object.keys(response).length === 2);
            assert(response.status === "OK");
            assert(response.exists === true);
        });

        it("test good input, email does not exists", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "unknown@gmail.com",
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

            assert(Object.keys(response).length === 2);
            assert(response.status === "OK");
            assert(response.exists === false);
        });

        it("test email exists with a syntactically invalid email returns false", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "randomgmail.com",
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

            assert(Object.keys(response).length === 2);
            assert(response.status === "OK");
            assert(response.exists === false);
        });

        it("test sending an unnormalised email and you get exists is true", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "RanDoM@gmail.com",
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
            assert(Object.keys(response).length === 2);
            assert(response.status === "OK");
            assert(response.exists === true);
        });

        it("test bad input, do not pass email", async function () {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query()
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert(response.message === "Please provide the email as a GET param");
        });

        it("test passing an array instead of a string in the email returns an error message", async function () {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: ["test1", "test2"],
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
            assert(response.message === "Please provide the email as a GET param");
        });
    });

    describe(`With Body parser applied before`, function () {
        let app;

        before(async function () {
            await killAllST();
            await setupST();
            await startST();
            app = express();

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
            app.use(bodyParser.urlencoded({ extended: true }));
            app.use(bodyParser.json());
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());

            // Sign up.
            const signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
            assert(signUpResponse.status === 200);
            assert(JSON.parse(signUpResponse.text).status === "OK");
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test good input, email exists, with bodyParser applied before", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "random@gmail.com",
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

            assert(Object.keys(response).length === 2);
            assert(response.status === "OK");
            assert(response.exists === true);
        });

        it("test good input, email exists, with bodyParser applied after", async function () {
            let response = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "random@gmail.com",
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

            assert(Object.keys(response).length === 2);
            assert(response.status === "OK");
            assert(response.exists === true);
        });
    });
});
