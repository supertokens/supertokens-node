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
const { printPath, setupST, startST, stopST, killAllST, cleanST, signUPRequest } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const { Querier } = require("../../lib/build/querier");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
const request = require("supertest");
const express = require("express");
let bodyParser = require("body-parser");
let { middleware, errorHandler } = require("../../framework/express");

describe(`emailExists: ${printPath("[test/thirdpartyemailpassword/emailExists.test.js]")}`, function () {
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
    it("test that if disable api, the default email exists API does not work", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordEmailExistsGET: undefined,
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
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

    // testing error is correctly handled by the sub-recipe
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
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
});
