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
const { printPath, createCoreApplicationWithMultitenancy, removeAppAndTenants } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let Multitenancy = require("../../lib/build/recipe/multitenancy");
let Session = require("../../lib/build/recipe/session");
let ThirdParty = require("../../lib/build/recipe/thirdparty");
let nock = require("nock");
const express = require("express");
const request = require("supertest");
const { default: fetch } = require("cross-fetch");
let { middleware, errorHandler } = require("../../framework/express");
const { configsForVerification, providers } = require("./tpConfigsForVerification");

describe(`providerConfigTest: ${printPath("[test/thirdparty/provider.config.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    after(async function () {});

    it("test the provider override is not increasing call stack", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

        let stackCount = [];

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "test", clientSecret: "secret" }],
                                },
                                override: (oI) => {
                                    const err = new Error();
                                    stackCount.push(err.stack.split("\n").length);
                                    return {
                                        ...oI,
                                        getAuthorisationRedirectURL: async (input) => {
                                            return await oI.getAuthorisationRedirectURL(input);
                                        },
                                    };
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        for (let i = 0; i < 10; i++) {
            await (await ThirdParty.getProvider("public", "google")).getAuthorisationRedirectURL({
                redirectURIOnProviderDashboard: "http://localhost:8080",
                userContext: {},
            });
        }

        for (let i = 1; i < stackCount.length; i++) {
            assert.equal(stackCount[i], stackCount[i - 1]); // stack should be same and not increasing
        }
    });

    it("test the config is same within override and provider instance", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

        let oIConfig;
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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "test", clientSecret: "secret" }],
                                },
                                override: (oI) => {
                                    return {
                                        ...oI,
                                        getAuthorisationRedirectURL: async (input) => {
                                            oIConfig = oI.config;
                                            return await oI.getAuthorisationRedirectURL(input);
                                        },
                                    };
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        const provider = await ThirdParty.getProvider("public", "google");
        await provider.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "http://localhost:8080",
            userContext: {},
        });

        assert.strictEqual(provider.config, oIConfig);
    });

    it("test the config is same within override and provider instance when overriding getConfigForClientType", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

        let oIConfig;
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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "test", clientSecret: "secret" }],
                                },
                                override: (oI) => {
                                    return {
                                        ...oI,
                                        getConfigForClientType: async (input) => {
                                            return {
                                                id: "google",
                                                clientId: "hello",
                                                authorizationEndpoint: "http://localhost:8080/authorize",
                                            };
                                        },
                                        getAuthorisationRedirectURL: async (input) => {
                                            oIConfig = oI.config;
                                            return await oI.getAuthorisationRedirectURL(input);
                                        },
                                    };
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        const provider = await ThirdParty.getProvider("public", "google");
        await provider.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "http://localhost:8080",
            userContext: {},
        });

        assert.strictEqual(provider.config, oIConfig);
    });

    it("test built-in provider computed config from static config", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers,
                    },
                }),
            ],
        });

        for (const thirdPartyId in configsForVerification) {
            let providerRes = await ThirdParty.getProvider("public", thirdPartyId);
            let providerInfo = providerRes;

            for (const [key, value] of Object.entries(configsForVerification[thirdPartyId])) {
                assert.deepEqual(value, providerInfo.config[key]);
            }
        }
    });

    it("test built-in provider computed config from core config", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdPartyRecipe.init()],
        });

        for (const provider of providers) {
            await Multitenancy.createOrUpdateThirdPartyConfig("public", provider.config);
        }

        for (const thirdPartyId in configsForVerification) {
            let providerRes = await ThirdParty.getProvider("public", thirdPartyId);
            let providerInfo = providerRes;

            for (const [key, value] of Object.entries(configsForVerification[thirdPartyId])) {
                assert.deepEqual(value, providerInfo.config[key]);
            }
        }
    });

    it("test clientType matching when only one clientType is provided from static", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "test", clientSecret: "secret" }],
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        const providerInfo = await ThirdParty.getProvider("public", "google");
        assert.deepEqual(providerInfo.config.clientId, "test");
        assert.deepEqual(providerInfo.config.clientSecret, "secret");
    });

    it("test clientType matching when there are more than one clientType from static", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        { clientType: "web", clientId: "test1", clientSecret: "secret1" },
                                        { clientType: "mobile", clientId: "test2", clientSecret: "secret2" },
                                    ],
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        let providerInfo = await ThirdParty.getProvider("public", "google", "web");
        assert.deepEqual(providerInfo.config.clientId, "test1");
        assert.deepEqual(providerInfo.config.clientSecret, "secret1");

        providerInfo = await ThirdParty.getProvider("public", "google", "mobile");
        assert.deepEqual(providerInfo.config.clientId, "test2");
        assert.deepEqual(providerInfo.config.clientSecret, "secret2");
    });

    it("test clientType matching when there is one clientType from core", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdPartyRecipe.init()],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            clients: [{ clientId: "test", clientSecret: "secret" }],
        });

        const providerInfo = await ThirdParty.getProvider("public", "google");
        assert.deepEqual(providerInfo.config.clientId, "test");
        assert.deepEqual(providerInfo.config.clientSecret, "secret");
    });

    it("test clientType matching when there are more than one clientType from core", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdPartyRecipe.init()],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            clients: [
                { clientType: "web", clientId: "test1", clientSecret: "secret1" },
                { clientType: "mobile", clientId: "test2", clientSecret: "secret2" },
            ],
        });

        let providerInfo = await ThirdParty.getProvider("public", "google", "web");
        assert.deepEqual(providerInfo.config.clientId, "test1");
        assert.deepEqual(providerInfo.config.clientSecret, "secret1");

        providerInfo = await ThirdParty.getProvider("public", "google", "mobile");
        assert.deepEqual(providerInfo.config.clientId, "test2");
        assert.deepEqual(providerInfo.config.clientSecret, "secret2");
    });

    it("test clientType matching when there are same clientTypes from static and core", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        { clientType: "web", clientId: "t1", clientSecret: "s1" },
                                        { clientType: "mobile", clientId: "t2", clientSecret: "s2" },
                                    ],
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            clients: [
                { clientType: "web", clientId: "test1", clientSecret: "secret1" },
                { clientType: "mobile", clientId: "test2", clientSecret: "secret2" },
            ],
        });

        let providerInfo = await ThirdParty.getProvider("public", "google", "web");
        assert.deepEqual(providerInfo.config.clientId, "test1");
        assert.deepEqual(providerInfo.config.clientSecret, "secret1");

        providerInfo = await ThirdParty.getProvider("public", "google", "mobile");
        assert.deepEqual(providerInfo.config.clientId, "test2");
        assert.deepEqual(providerInfo.config.clientSecret, "secret2");
    });

    it("test clientType matching when there are different clientTypes from static and core", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [{ clientType: "web", clientId: "test1", clientSecret: "secret1" }],
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            clients: [{ clientType: "mobile", clientId: "test2", clientSecret: "secret2" }],
        });

        let providerInfo = await ThirdParty.getProvider("public", "google", "web");
        assert.deepEqual(providerInfo.config.clientId, "test1");
        assert.deepEqual(providerInfo.config.clientSecret, "secret1");

        providerInfo = await ThirdParty.getProvider("public", "google", "mobile");
        assert.deepEqual(providerInfo.config.clientId, "test2");
        assert.deepEqual(providerInfo.config.clientSecret, "secret2");
    });

    it("test getProvider and signInUp on an app and tenant", async function () {
        const connectionURI = await createCoreApplicationWithMultitenancy();

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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "test", clientSecret: "secret" }],
                                },
                                override: (oI) => {
                                    return {
                                        ...oI,
                                        getUserInfo: async (oAuthTokens) => {
                                            return {
                                                thirdPartyUserId: "googleuser",
                                                email: {
                                                    id: "email@test.com",
                                                    isVerified: false,
                                                },
                                                rawUserInfoFromProvider: {
                                                    fromIdTokenPayload: {},
                                                    fromUserInfoAPI: {},
                                                },
                                            };
                                        },
                                    };
                                },
                            },
                        ],
                    },
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "google",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
                })
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.thirdParty[0].id, "google");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "googleuser");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");

        await Multitenancy.createOrUpdateTenant("t1", {
            firstFactors: null,
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "google",
        });

        response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/t1/signinup")
                .send({
                    thirdPartyId: "google",
                    oAuthTokens: {
                        access_token: "saodiasjodai",
                    },
                })
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
        assert.strictEqual(response1.body.createdNewRecipeUser, true);
        assert.strictEqual(response1.body.user.thirdParty[0].id, "google");
        assert.strictEqual(response1.body.user.thirdParty[0].userId, "googleuser");
        assert.strictEqual(response1.body.user.emails[0], "email@test.com");
        assert.deepEqual(response1.body.user.tenantIds, ["t1"]);
    });
});
