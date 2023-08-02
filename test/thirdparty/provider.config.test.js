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
const { printPath, setupST, startSTWithMultitenancy, killAllST, cleanST } = require("../utils");
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
let { middleware, errorHandler } = require("../../framework/express");

const privateKey =
    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----";

const configsForVerification = {
    "active-directory": {
        oidcDiscoveryEndpoint: "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/v2.0/",
        scope: ["openid", "email"],
        authorizationEndpoint:
            "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/oauth2/v2.0/authorize",
        tokenEndpoint: "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/oauth2/v2.0/token",
        userInfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
        jwksURI: "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/discovery/v2.0/keys",
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    apple: {
        scope: ["openid", "email"],
        authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
        tokenEndpoint: "https://appleid.apple.com/auth/token",
        jwksURI: "https://appleid.apple.com/auth/keys",
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    bitbucket: {
        authorizationEndpoint: "https://bitbucket.org/site/oauth2/authorize",
        tokenEndpoint: "https://bitbucket.org/site/oauth2/access_token",
        authorizationEndpointQueryParams: { audience: "api.atlassian.com" },
        scope: ["account", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    "boxy-saml": {
        additionalConfig: { boxyURL: "https://test.boxy.com:5225" },
        authorizationEndpoint: "https://test.boxy.com:5225/api/oauth/authorize",
        tokenEndpoint: "https://test.boxy.com:5225/api/oauth/token",
        userInfoEndpoint: "https://test.boxy.com:5225/api/oauth/userinfo",
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "id", email: "email", emailVerified: "email_verified" },
        },
    },
    discord: {
        authorizationEndpoint: "https://discord.com/oauth2/authorize",
        tokenEndpoint: "https://discord.com/api/oauth2/token",
        userInfoEndpoint: "https://discord.com/api/users/@me",
        scope: ["identify", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "id", email: "email", emailVerified: "verified" },
        },
    },
    facebook: {
        authorizationEndpoint: "https://www.facebook.com/v12.0/dialog/oauth",
        tokenEndpoint: "https://graph.facebook.com/v12.0/oauth/access_token",
        userInfoEndpoint: "https://graph.facebook.com/me",
        scope: ["email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "id", email: "email", emailVerified: "email_verified" },
        },
    },
    github: {
        authorizationEndpoint: "https://github.com/login/oauth/authorize",
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        scope: ["read:user", "user:email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    gitlab: {
        authorizationEndpoint: "https://gitlab.com/oauth/authorize",
        tokenEndpoint: "https://gitlab.com/oauth/token",
        userInfoEndpoint: "https://gitlab.com/oauth/userinfo",
        jwksURI: "https://gitlab.com/oauth/discovery/keys",
        scope: ["openid", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    google: {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwksURI: "https://www.googleapis.com/oauth2/v3/certs",
        scope: ["openid", "email"],
        authorizationEndpointQueryParams: { included_grant_scopes: "true", access_type: "offline" },
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    "google-workspaces": {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwksURI: "https://www.googleapis.com/oauth2/v3/certs",
        scope: ["openid", "email"],
        authorizationEndpointQueryParams: { included_grant_scopes: "true", access_type: "offline", hd: "*" },
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
        additionalConfig: { hd: "*" },
    },
    linkedin: {
        authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
        tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
        scope: ["r_emailaddress", "r_liteprofile"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
    okta: {
        authorizationEndpoint: "https://dev-8636097.okta.com/oauth2/v1/authorize",
        tokenEndpoint: "https://dev-8636097.okta.com/oauth2/v1/token",
        userInfoEndpoint: "https://dev-8636097.okta.com/oauth2/v1/userinfo",
        jwksURI: "https://dev-8636097.okta.com/oauth2/v1/keys",
        scope: ["openid", "email"],
        userInfoMap: {
            fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
            fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
        },
    },
};

const providers = [
    ...[
        "active-directory",
        "apple",
        "bitbucket",
        "boxy-saml",
        "discord",
        "facebook",
        "github",
        "gitlab",
        "google",
        "google-workspaces",
        "linkedin",
        "okta",
    ].map((thirdPartyId) => {
        let config = {
            thirdPartyId,
            clients: [{ clientId: "test", clientSecret: "secret" }],
        };

        if (thirdPartyId === "active-directory") {
            config.clients[0].additionalConfig = {
                directoryId: "97f9a564-fcee-4b88-ae34-a1fbc4656593",
            };
        } else if (thirdPartyId === "apple") {
            config.clients[0].clientSecret = undefined;
            config.clients[0].additionalConfig = {
                keyId: "test-key",
                privateKey,
                teamId: "test-team-id",
            };
        } else if (thirdPartyId === "boxy-saml") {
            config.clients[0].additionalConfig = {
                boxyURL: "https://test.boxy.com:5225",
            };
        } else if (thirdPartyId === "okta") {
            config.clients[0].additionalConfig = {
                oktaDomain: "dev-8636097.okta.com",
            };
        }

        return { config };
    }),
];

describe(`providerConfigTest: ${printPath("[test/thirdparty/provider.config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test built-in provider computed config from static config", async function () {
        await startSTWithMultitenancy();

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

    describe("test built-in provider computed config from static config with overrides", async function () {
        const overrides = [
            {
                input: { authorizationEndpoint: "https://auth.example.com" },
                expect: { authorizationEndpoint: "https://auth.example.com" },
            },
            {
                input: { authorizationEndpointQueryParams: { foo: "bar" } },
                expect: { authorizationEndpointQueryParams: { foo: "bar" } },
            },
            {
                input: { tokenEndpoint: "https://token.example.com" },
                expect: { tokenEndpoint: "https://token.example.com" },
            },
            { input: { tokenEndpointBodyParams: { foo: "bar" } }, expect: { tokenEndpointBodyParams: { foo: "bar" } } },
            {
                input: { userInfoEndpoint: "https://auth.example.com/user" },
                expect: { userInfoEndpoint: "https://auth.example.com/user" },
            },
            {
                input: { userInfoEndpointQueryParams: { foo: "bar" } },
                expect: { userInfoEndpointQueryParams: { foo: "bar" } },
            },
            { input: { userInfoEndpointHeaders: { foo: "bar" } }, expect: { userInfoEndpointHeaders: { foo: "bar" } } },
            {
                input: { userInfoMap: { fromUserInfoAPI: { userId: "userid" } } },
                expect: {
                    userInfoMap: { fromUserInfoAPI: { userId: "userid" } },
                },
            },
            {
                input: { userInfoMap: { fromUserInfoAPI: { email: "useremail" } } },
                expect: {
                    userInfoMap: { fromUserInfoAPI: { email: "useremail" } },
                },
            },
            {
                input: { userInfoMap: { fromUserInfoAPI: { emailVerified: "useremail_verified" } } },
                expect: {
                    userInfoMap: { fromUserInfoAPI: { emailVerified: "useremail_verified" } },
                },
            },
            {
                input: { userInfoMap: { fromIdTokenPayload: { userId: "userid" } } },
                expect: {
                    userInfoMap: { fromIdTokenPayload: { userId: "userid" } },
                },
            },
            {
                input: { userInfoMap: { fromIdTokenPayload: { email: "useremail" } } },
                expect: {
                    userInfoMap: { fromIdTokenPayload: { email: "useremail" } },
                },
            },
            {
                input: { userInfoMap: { fromIdTokenPayload: { emailVerified: "useremail_verified" } } },
                expect: {
                    userInfoMap: { fromIdTokenPayload: { emailVerified: "useremail_verified" } },
                },
            },
        ];
        for (const provider of providers) {
            for (const overrideVal of overrides) {
                it(`should work for ${provider.config.thirdPartyId} with override ${JSON.stringify(
                    overrideVal.input
                )}`, async function () {
                    await startSTWithMultitenancy();

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
                            ThirdPartyRecipe.init({
                                signInAndUpFeature: {
                                    providers: [
                                        {
                                            config: {
                                                ...provider.config,
                                                ...overrideVal.input,
                                            },
                                        },
                                    ],
                                },
                            }),
                        ],
                    });

                    const providerInfo = await ThirdParty.getProvider("public", provider.config.thirdPartyId);
                    for (const [key, value] of Object.entries(overrideVal.expect)) {
                        if (typeof value === "object") {
                            if (key === "userInfoMap") {
                                const expectedValue = {
                                    fromUserInfoAPI: {
                                        ...(configsForVerification[provider.config.thirdPartyId].userInfoMap
                                            .fromUserInfoAPI || {}),
                                        ...value.fromUserInfoAPI,
                                    },
                                    fromIdTokenPayload: {
                                        ...configsForVerification[provider.config.thirdPartyId].userInfoMap
                                            .fromIdTokenPayload,
                                        ...value.fromIdTokenPayload,
                                    },
                                };
                                assert.deepEqual(expectedValue, providerInfo.config[key]);
                            } else {
                                for (const [k, v] of Object.entries(value)) {
                                    assert.deepEqual(v, providerInfo.config[key][k]);
                                }
                            }
                        } else {
                            assert.deepEqual(value, providerInfo.config[key]);
                        }
                    }
                });
            }
        }
    });

    describe("test built-in provider computed config from core config with overrides", async function () {
        const overrides = [
            {
                input: { authorizationEndpoint: "https://auth.example.com" },
                expect: { authorizationEndpoint: "https://auth.example.com" },
            },
            {
                input: { authorizationEndpointQueryParams: { foo: "bar" } },
                expect: { authorizationEndpointQueryParams: { foo: "bar" } },
            },
            {
                input: { tokenEndpoint: "https://token.example.com" },
                expect: { tokenEndpoint: "https://token.example.com" },
            },
            { input: { tokenEndpointBodyParams: { foo: "bar" } }, expect: { tokenEndpointBodyParams: { foo: "bar" } } },
            {
                input: { userInfoEndpoint: "https://auth.example.com/user" },
                expect: { userInfoEndpoint: "https://auth.example.com/user" },
            },
            {
                input: { userInfoEndpointQueryParams: { foo: "bar" } },
                expect: { userInfoEndpointQueryParams: { foo: "bar" } },
            },
            { input: { userInfoEndpointHeaders: { foo: "bar" } }, expect: { userInfoEndpointHeaders: { foo: "bar" } } },
            {
                input: { userInfoMap: { fromUserInfoAPI: { userId: "userid" } } },
                expect: {
                    userInfoMap: { fromUserInfoAPI: { userId: "userid" } },
                },
            },
            {
                input: { userInfoMap: { fromUserInfoAPI: { email: "useremail" } } },
                expect: {
                    userInfoMap: { fromUserInfoAPI: { email: "useremail" } },
                },
            },
            {
                input: { userInfoMap: { fromUserInfoAPI: { emailVerified: "useremail_verified" } } },
                expect: {
                    userInfoMap: { fromUserInfoAPI: { emailVerified: "useremail_verified" } },
                },
            },
            {
                input: { userInfoMap: { fromIdTokenPayload: { userId: "userid" } } },
                expect: {
                    userInfoMap: { fromIdTokenPayload: { userId: "userid" } },
                },
            },
            {
                input: { userInfoMap: { fromIdTokenPayload: { email: "useremail" } } },
                expect: {
                    userInfoMap: { fromIdTokenPayload: { email: "useremail" } },
                },
            },
            {
                input: { userInfoMap: { fromIdTokenPayload: { emailVerified: "useremail_verified" } } },
                expect: {
                    userInfoMap: { fromIdTokenPayload: { emailVerified: "useremail_verified" } },
                },
            },
        ];
        for (const provider of providers) {
            for (const overrideVal of overrides) {
                it(`should work for ${provider.config.thirdPartyId} with override ${JSON.stringify(
                    overrideVal.input
                )}`, async function () {
                    await startSTWithMultitenancy();

                    STExpress.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [ThirdPartyRecipe.init()],
                    });

                    await Multitenancy.createOrUpdateThirdPartyConfig("public", {
                        ...provider.config,
                        ...overrideVal.input,
                    });

                    const providerInfo = await ThirdParty.getProvider("public", provider.config.thirdPartyId);
                    for (const [key, value] of Object.entries(overrideVal.expect)) {
                        if (typeof value === "object") {
                            if (key === "userInfoMap") {
                                const expectedValue = {
                                    fromUserInfoAPI: {
                                        ...(configsForVerification[provider.config.thirdPartyId].userInfoMap
                                            .fromUserInfoAPI || {}),
                                        ...value.fromUserInfoAPI,
                                    },
                                    fromIdTokenPayload: {
                                        ...configsForVerification[provider.config.thirdPartyId].userInfoMap
                                            .fromIdTokenPayload,
                                        ...value.fromIdTokenPayload,
                                    },
                                };
                                assert.deepEqual(expectedValue, providerInfo.config[key]);
                            } else {
                                for (const [k, v] of Object.entries(value)) {
                                    assert.deepEqual(v, providerInfo.config[key][k]);
                                }
                            }
                        } else {
                            assert.deepEqual(value, providerInfo.config[key]);
                        }
                    }
                });
            }
        }
    });

    it("test built-in provider computed config from core config", async function () {
        await startSTWithMultitenancy();

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
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
        await startSTWithMultitenancy();

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
        await startSTWithMultitenancy();

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
        await startSTWithMultitenancy();

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
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
        await startSTWithMultitenancy();

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
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
        await startSTWithMultitenancy();

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
        await startSTWithMultitenancy();

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
        await startSTWithMultitenancy();

        // Create app
        await fetch("http://localhost:8080/recipe/multitenancy/app", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                appId: "a1",
                emailPasswordEnabled: true,
                thirdPartyEnabled: true,
                passwordlessEnabled: true,
            }),
        });

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080/appid-a1",
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
        assert.strictEqual(response1.body.createdNewUser, true);
        assert.strictEqual(response1.body.user.thirdParty.id, "google");
        assert.strictEqual(response1.body.user.thirdParty.userId, "googleuser");
        assert.strictEqual(response1.body.user.email, "email@test.com");

        await Multitenancy.createOrUpdateTenant("t1", {
            emailPasswordEnabled: true,
            passwordlessEnabled: true,
            thirdPartyEnabled: true,
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
        assert.strictEqual(response1.body.createdNewUser, true);
        assert.strictEqual(response1.body.user.thirdParty.id, "google");
        assert.strictEqual(response1.body.user.thirdParty.userId, "googleuser");
        assert.strictEqual(response1.body.user.email, "email@test.com");
        assert.deepEqual(response1.body.user.tenantIds, ["t1"]);
    });
});
