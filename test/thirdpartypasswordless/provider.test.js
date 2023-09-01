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
const { printPath, setupST, startST, killAllST, cleanST, isCDIVersionCompatible } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyPasswordlessRecipe = require("../../lib/build/recipe/thirdpartypasswordless/recipe").default;
let ThirdPartyPasswordless = require("../../lib/build/recipe/thirdpartypasswordless");
let { middleware, errorHandler } = require("../../framework/express");
let nock = require("nock");

const privateKey =
    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----";

/**
 * TODO
 * - Google
 *   - pass additional params, check they are present in authorisation url
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 * - Facebook
 *   - test minimum config
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 * - Github
 *   - test minimum config
 *   - pass additional params, check they are present in authorisation url
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 * - Apple
 *   - test minimum config
 *   - pass additional params, check they are present in authorisation url
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 */
describe(`providerTest: ${printPath("[test/thirdpartypasswordless/provider.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test with thirdpartypasswordless, the minimum config for third party provider google", async function () {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [
                                    {
                                        clientId: "test",
                                        clientSecret: "test-secret",
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "google");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "google");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://oauth2.googleapis.com/token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://accounts.google.com/o/oauth2/v2/auth");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://accounts.google.com/o/oauth2/v2/auth");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            access_type: "offline",
            client_id: "test",
            included_grant_scopes: "true",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "openid email",
        });

        let tokenBody = {};
        nock("https://oauth2.googleapis.com")
            .post("/token", function (body) {
                tokenBody = body;
                return true;
            })
            .reply(200, {
                access_token: "abcd",
            });

        await providerInfo.exchangeAuthCodeForOAuthTokens({
            redirectURIInfo: {
                redirectURIOnProviderDashboard: "redirect",
                redirectURIQueryParams: {
                    code: "abcd",
                },
            },
        });
        assert.deepEqual(tokenBody, {
            client_id: "test",
            client_secret: "test-secret",
            grant_type: "authorization_code",
            code: "abcd",
            redirect_uri: "redirect",
        });
    });

    it("test with thirdPartyPasswordless, passing additional params, check they are present in authorisation url for thirdparty provider google", async function () {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [
                                    {
                                        clientId: "test",
                                        clientSecret: "test-secret",
                                    },
                                ],
                                authorizationEndpointQueryParams: {
                                    key1: "value1",
                                    key2: "value2",
                                },
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "google");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "google");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://oauth2.googleapis.com/token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://accounts.google.com/o/oauth2/v2/auth");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://accounts.google.com/o/oauth2/v2/auth");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            access_type: "offline",
            client_id: "test",
            included_grant_scopes: "true",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "openid email",
            key1: "value1",
            key2: "value2",
        });
    });

    it("test for thirdPartyPasswordless, passing scopes in config for thirdparty provider google", async function () {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [
                                    {
                                        clientId: "test",
                                        clientSecret: "test-secret",
                                        scope: ["test-scope-1", "test-scope-2"],
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "google");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "google");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://oauth2.googleapis.com/token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://accounts.google.com/o/oauth2/v2/auth");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://accounts.google.com/o/oauth2/v2/auth");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            access_type: "offline",
            client_id: "test",
            included_grant_scopes: "true",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it("test for thirdPartyPasswordless, minimum config for third party provider facebook", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "facebook",
                                clients: [
                                    {
                                        clientId,
                                        clientSecret,
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "facebook");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "facebook");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://graph.facebook.com/v12.0/oauth/access_token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://www.facebook.com/v12.0/dialog/oauth");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://www.facebook.com/v12.0/dialog/oauth");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "email",
        });

        let tokenBody = {};
        nock("https://graph.facebook.com")
            .post("/v12.0/oauth/access_token", function (body) {
                tokenBody = body;
                return true;
            })
            .reply(200, {
                access_token: "abcd",
            });

        await providerInfo.exchangeAuthCodeForOAuthTokens({
            redirectURIInfo: {
                redirectURIOnProviderDashboard: "redirect",
                redirectURIQueryParams: {
                    code: "abcd",
                },
            },
        });
        assert.deepEqual(tokenBody, {
            client_id: "test",
            client_secret: "test-secret",
            grant_type: "authorization_code",
            code: "abcd",
            redirect_uri: "redirect",
        });
    });

    it("test with thirdPartyPasswordless, passing scopes in config for third party provider facebook", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "facebook",
                                clients: [
                                    {
                                        clientId,
                                        clientSecret,
                                        scope: ["test-scope-1", "test-scope-2"],
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "facebook");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "facebook");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://graph.facebook.com/v12.0/oauth/access_token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://www.facebook.com/v12.0/dialog/oauth");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://www.facebook.com/v12.0/dialog/oauth");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it("test with thirdPartyPasswordless, minimum config for third party provider github", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirdPartyPasswordlessRecipe.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "github",
                                clients: [
                                    {
                                        clientId,
                                        clientSecret,
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "github");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "github");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://github.com/login/oauth/access_token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://github.com/login/oauth/authorize");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://github.com/login/oauth/authorize");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "read:user user:email",
        });

        let tokenBody = {};
        nock("https://github.com")
            .post("/login/oauth/access_token", function (body) {
                tokenBody = body;
                return true;
            })
            .reply(200, {
                access_token: "abcd",
            });

        await providerInfo.exchangeAuthCodeForOAuthTokens({
            redirectURIInfo: {
                redirectURIOnProviderDashboard: "redirect",
                redirectURIQueryParams: {
                    code: "abcd",
                },
            },
        });
        assert.deepEqual(tokenBody, {
            client_id: "test",
            client_secret: "test-secret",
            grant_type: "authorization_code",
            code: "abcd",
            redirect_uri: "redirect",
        });
    });

    it("test with thirdPartyPasswordless, additional params, check they are present in authorisation url for third party provider github", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "github",
                                clients: [
                                    {
                                        clientId,
                                        clientSecret,
                                    },
                                ],
                                authorizationEndpointQueryParams: {
                                    key1: "value1",
                                    key2: "value2",
                                },
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "github");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "github");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://github.com/login/oauth/access_token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://github.com/login/oauth/authorize");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://github.com/login/oauth/authorize");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "read:user user:email",
            key1: "value1",
            key2: "value2",
        });
    });

    it("test with thirdPartyPasswordless, passing scopes in config for third party provider github", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "github",
                                clients: [
                                    {
                                        clientId,
                                        clientSecret,
                                        scope: ["test-scope-1", "test-scope-2"],
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "github");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "github");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://github.com/login/oauth/access_token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://github.com/login/oauth/authorize");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://github.com/login/oauth/authorize");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it("test with thirdPartyPasswordless, minimum config for third party provider apple", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let additionalConfig = {
            keyId: "test-key",
            privateKey,
            teamId: "test-team-id",
        };

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "apple",
                                clients: [
                                    {
                                        clientId,
                                        additionalConfig,
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "apple");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "apple");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://appleid.apple.com/auth/token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://appleid.apple.com/auth/authorize");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://appleid.apple.com/auth/authorize");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            response_mode: "form_post",
            scope: "openid email",
        });

        let tokenBody = {};
        nock("https://appleid.apple.com")
            .post("/auth/token", function (body) {
                tokenBody = body;
                return true;
            })
            .reply(200, {
                access_token: "abcd",
            });

        await providerInfo.exchangeAuthCodeForOAuthTokens({
            redirectURIInfo: {
                redirectURIOnProviderDashboard: "redirect",
                redirectURIQueryParams: {
                    code: "abcd",
                },
            },
        });
        assert.notEqual(tokenBody.client_secret, undefined);
        delete tokenBody.client_secret;

        assert.deepEqual(tokenBody, {
            client_id: "test",
            grant_type: "authorization_code",
            code: "abcd",
            redirect_uri: "redirect",
        });
    });

    it("test with thirdPartyPasswordless, passing additional params, check they are present in authorisation url for third party provider apple", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let additionalConfig = {
            keyId: "test-key",
            privateKey,
            teamId: "test-team-id",
        };

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
                ThirdPartyPasswordlessRecipe.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "apple",
                                clients: [
                                    {
                                        clientId,
                                        additionalConfig,
                                    },
                                ],
                                authorizationEndpointQueryParams: {
                                    key1: "value1",
                                    key2: "value2",
                                },
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "apple");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "apple");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://appleid.apple.com/auth/token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://appleid.apple.com/auth/authorize");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://appleid.apple.com/auth/authorize");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_mode: "form_post",
            response_type: "code",
            scope: "openid email",
            key1: "value1",
            key2: "value2",
        });
    });

    it("test with thirdPartyPasswordless, passing scopes in config for third party provider apple", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let additionalConfig = {
            keyId: "test-key",
            privateKey,
            teamId: "test-team-id",
        };

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "apple",
                                clients: [
                                    {
                                        clientId,
                                        additionalConfig,
                                        scope: ["test-scope-1", "test-scope-2"],
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "apple");
        let providerInfo = providerRes;

        assert.strictEqual(providerInfo.id, "apple");
        assert.strictEqual(providerInfo.config.tokenEndpoint, "https://appleid.apple.com/auth/token");
        assert.strictEqual(providerInfo.config.authorizationEndpoint, "https://appleid.apple.com/auth/authorize");

        const authUrlResult = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "redirect",
            userContext: {},
        });
        assert.deepStrictEqual(authUrlResult.pkceCodeVerifier, undefined);

        const authUrl = new URL(authUrlResult.urlWithQueryParams);
        assert.deepStrictEqual(authUrl.origin + authUrl.pathname, "https://appleid.apple.com/auth/authorize");

        function paramsToObject(entries) {
            const result = {};
            for (const [key, value] of entries) {
                // each 'entry' is a [key, value] tupple
                result[key] = value;
            }
            return result;
        }
        const authParams = paramsToObject(new URLSearchParams(authUrl.search.substring(1)).entries());
        assert.deepEqual(authParams, {
            client_id: "test",
            redirect_uri: "redirect",
            response_type: "code",
            response_mode: "form_post",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it.skip("test with thirdPartyPasswordless, passing invalid privateKey in config for third party provider apple", async function () {
        const connectionURI = await startST();

        let clientId = "test";
        let additionalConfig = {
            keyId: "test-key",
            privateKey: "invalidKey",
            teamId: "test-team-id",
        };

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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [
                        {
                            config: {
                                thirdPartyId: "apple",
                                clients: [
                                    {
                                        clientId,
                                        additionalConfig,
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        try {
            let providerRes = await ThirdPartyPasswordless.thirdPartyGetProvider("public", "apple");
            let providerInfo = providerRes;
            assert(false);
        } catch (err) {
            assert.equal(err.toString(), "Error: error:0909006C:PEM routines:get_name:no start line");
        }
    });

    it("test with thirdPartyPasswordless duplicate provider without any default", async function () {
        const connectionURI = await startST();
        try {
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
                    ThirdPartyPasswordless.init({
                        contactMethod: "EMAIL",
                        emailDelivery: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId: "test",
                                            clientSecret: "test-secret",
                                        },
                                    ],
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId: "test2",
                                            clientSecret: "test-secret2",
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                ],
            });
            throw new Error("should fail");
        } catch (err) {
            assert(err.message === `The providers array has multiple entries for the same third party provider.`);
        }
    });
});
