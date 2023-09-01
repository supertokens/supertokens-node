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
let STExpress = require("../../");
let Multitenancy = require("../../lib/build/recipe/multitenancy");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPasswordRecipe = require("../../lib/build/recipe/thirdpartyemailpassword/recipe").default;
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
let { middleware, errorHandler } = require("../../framework/express");

describe(`authorisationTest: ${printPath("[test/thirdpartyemailpassword/authorisationFeature.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        return {
                            thirdPartyUserId: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };
    });
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test minimum config for thirdparty module", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyEmailPasswordRecipe.init({
                    providers: [this.customProvider1],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=custom&redirectURIOnProviderDashboard=redirect")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(
            response1.body.urlWithQueryParams,
            "https://test.com/oauth/auth?client_id=supetokens&redirect_uri=redirect&response_type=code&scope=test"
        );
    });

    it("test calling authorisation url API with empty init", async function () {
        const connectionURI = await startST();

        // testing with the google OAuth development key
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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyEmailPasswordRecipe.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            res.status(500).send(err.message);
        });

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=google&redirectURIOnProviderDashboard=redirect")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.status, 400);
        assert.strictEqual(response1.body.message, "the provider google could not be found in the configuration");
    });

    it("test calling authorisation url API with empty init with dynamic third party provider", async function () {
        const connectionURI = await startST();

        // testing with the google OAuth development key
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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyEmailPasswordRecipe.init(),
            ],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            name: "Google",
            clients: [
                {
                    clientId: "google-client-id",
                    clientSecret: "google-client-secret",
                },
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            res.status(500).send(err.message);
        });

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=google&redirectURIOnProviderDashboard=redirect")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(
            response1.body.urlWithQueryParams,
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=google-client-id&redirect_uri=redirect&response_type=code&scope=openid+email&included_grant_scopes=true&access_type=offline"
        );
    });

    // testing 4xx error correctly thrown from sub-recipe
    it("test thirdparty provider doesn't exist", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyEmailPasswordRecipe.init({
                    providers: [this.customProvider1],
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=google&redirectURIOnProviderDashboard=redirect")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 400);
        assert.strictEqual(response1.body.message, "the provider google could not be found in the configuration");
    });
});
