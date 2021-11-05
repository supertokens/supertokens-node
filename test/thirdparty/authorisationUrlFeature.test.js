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
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let ThirParty = require("../../lib/build/recipe/thirdparty");
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
let { middleware, errorHandler } = require("../../framework/express");

describe(`authorisationTest: ${printPath("[test/thirdparty/authorisationFeature.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                        params: {
                            scope: "test",
                            client_id: "supertokens",
                            dynamic: function dynamicParam(request) {
                                return request.query.dynamic;
                            },
                        },
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };

        this.customProvider2 = {
            id: "custom",
            get: (recipe, authCode) => {
                throw new Error("error from get function");
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

    it("test that using development OAuth keys will use the development authorisation url", async function () {
        await startST();

        // testing with the google OAuth development key
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
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Google({
                                clientId: "4398792-test-id",
                                clientSecret: "test-secret",
                            }),
                        ],
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=google")
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

        let url = new URL(response1.body.url);
        assert.strictEqual(url.origin, "https://supertokens.io");

        assert.strictEqual(url.pathname, "/dev/oauth/redirect-to-provider");
    });

    it("test minimum config for thirdparty module", async function () {
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
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=custom&dynamic=example.com")
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
            response1.body.url,
            "https://test.com/oauth/auth?scope=test&client_id=supertokens&dynamic=example.com"
        );
    });

    it("test provider get function throws error", async function () {
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
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider2],
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, request, response, next) => {
            response.status(500).send({
                message: err.message,
            });
        });

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=custom")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.statusCode, 500);
        assert.deepStrictEqual(response1.body, { message: "error from get function" });
    });

    it("test thirdparty provider doesn't exist", async function () {
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
                Session.init(),
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl?thirdPartyId=google")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 400);
        assert.strictEqual(
            response1.body.message,
            "The third party provider google seems to be missing from the backend configs."
        );
    });

    it("test invalid GET params for thirdparty module", async function () {
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
                Session.init(),
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .get("/auth/authorisationurl")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 400);
        assert.strictEqual(response1.body.message, "Please provide the thirdPartyId as a GET param");
    });
});
