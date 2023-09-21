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
const request = require("supertest");
const express = require("express");
let bodyParser = require("body-parser");
let { middleware, errorHandler } = require("../../framework/express");

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
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // disable the email exists API, and check that calling it returns a 404.
    it("test that if disableing api, the default email exists API does not work", async function () {
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
                                emailExistsGET: undefined,
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

    // email exists
    it("test good input, email exists", async function () {
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

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
        assert(signUpResponse.status === 200);
        assert(JSON.parse(signUpResponse.text).status === "OK");

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

    //email does not exist
    it("test good input, email does not exists", async function () {
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
        assert(response.exists === false);
    });

    //pass an invalid (syntactically) email and check that you get exists: false
    it("test email exists a syntactically invalid email", async function () {
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

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
        assert(signUpResponse.status === 200);
        assert(JSON.parse(signUpResponse.text).status === "OK");

        let response = await new Promise((resolve) =>
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

    //pass an unnormalised email, and check that you get exists true
    it("test sending an unnormalised email and you get exists is true", async function () {
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

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
        assert(signUpResponse.status === 200);
        assert(JSON.parse(signUpResponse.text).status === "OK");

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/signup/email/exists")
                .query({
                    email: "RaNdOm@gmail.com",
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

    //do not pass email
    it("test bad input, do not pass email", async function () {
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

    // pass an array instead of string in the email
    it("test passing an array instead of a string in the email", async function () {
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

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
        assert(signUpResponse.status === 200);
        assert(JSON.parse(signUpResponse.text).status === "OK");

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

    // email exists
    it("test good input, email exists, with bodyParser applied before", async function () {
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

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        app.use(middleware());

        app.use(errorHandler());

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
        assert(signUpResponse.status === 200);
        assert(JSON.parse(signUpResponse.text).status === "OK");

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

    // email exists
    it("test good input, email exists, with bodyParser applied after", async function () {
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

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        app.use(errorHandler());

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validPass123");
        assert(signUpResponse.status === 200);
        assert(JSON.parse(signUpResponse.text).status === "OK");

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
