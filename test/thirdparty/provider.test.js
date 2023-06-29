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
let { middleware, errorHandler } = require("../../framework/express");

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
describe(`providerTest: ${printPath("[test/thirdparty/provider.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test minimum config for third party provider google", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Google({
                                clientId: "test",
                                clientSecret: "test-secret",
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "google");
        let providerInfoGetResult = await providerInfo.get();
        assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, "https://oauth2.googleapis.com/token");
        assert.strictEqual(
            providerInfoGetResult.authorisationRedirect.url,
            "https://accounts.google.com/o/oauth2/v2/auth"
        );
        assert.deepStrictEqual(providerInfoGetResult.accessTokenAPI.params, {
            client_id: "test",
            client_secret: "test-secret",
            grant_type: "authorization_code",
        });
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            access_type: "offline",
            include_granted_scopes: "true",
            response_type: "code",
            scope: "https://www.googleapis.com/auth/userinfo.email",
        });
    });

    it("test passing additional params, check they are present in authorisation url for thirdparty provider google", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Google({
                                clientId: "test",
                                clientSecret: "test-secret",
                                authorisationRedirect: {
                                    params: {
                                        key1: "value1",
                                        key2: "value2",
                                    },
                                },
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "google");
        let providerInfoGetResult = await providerInfo.get();

        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            access_type: "offline",
            include_granted_scopes: "true",
            response_type: "code",
            scope: "https://www.googleapis.com/auth/userinfo.email",
            key1: "value1",
            key2: "value2",
        });
    });

    it("test passing scopes in config for thirdparty provider google", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Google({
                                clientId: "test",
                                clientSecret: "test-secret",
                                scope: ["test-scope-1", "test-scope-2"],
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "google");
        let providerInfoGetResult = await providerInfo.get();

        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            access_type: "offline",
            include_granted_scopes: "true",
            response_type: "code",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it("test minimum config for third party provider facebook", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Facebook({
                                clientId,
                                clientSecret,
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "facebook");
        let providerInfoGetResult = await providerInfo.get();
        assert.strictEqual(
            providerInfoGetResult.accessTokenAPI.url,
            "https://graph.facebook.com/v9.0/oauth/access_token"
        );
        assert.strictEqual(
            providerInfoGetResult.authorisationRedirect.url,
            "https://www.facebook.com/v9.0/dialog/oauth"
        );
        assert.deepStrictEqual(providerInfoGetResult.accessTokenAPI.params, {
            client_id: clientId,
            client_secret: clientSecret,
        });
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            response_type: "code",
            scope: "email",
        });
    });

    it("test passing scopes in config for third party provider facebook", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Facebook({
                                clientId,
                                clientSecret,
                                scope: ["test-scope-1", "test-scope-2"],
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "facebook");
        let providerInfoGetResult = await providerInfo.get();
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            response_type: "code",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it("test minimum config for third party provider github", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Github({
                                clientId,
                                clientSecret,
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "github");
        let providerInfoGetResult = await providerInfo.get();
        assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, "https://github.com/login/oauth/access_token");
        assert.strictEqual(providerInfoGetResult.authorisationRedirect.url, "https://github.com/login/oauth/authorize");
        assert.deepStrictEqual(providerInfoGetResult.accessTokenAPI.params, {
            client_id: clientId,
            client_secret: clientSecret,
        });
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            scope: "read:user user:email",
        });
    });

    it("test additional params, check they are present in authorisation url for third party provider github", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Github({
                                clientId,
                                clientSecret,
                                authorisationRedirect: {
                                    params: {
                                        key1: "value1",
                                        key2: "value2",
                                    },
                                },
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "github");
        let providerInfoGetResult = await providerInfo.get();
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            scope: "read:user user:email",
            key1: "value1",
            key2: "value2",
        });
    });

    it("test passing scopes in config for third party provider github", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = "test-secret";

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Github({
                                clientId,
                                clientSecret,
                                scope: ["test-scope-1", "test-scope-2"],
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "github");
        let providerInfoGetResult = await providerInfo.get();
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            scope: "test-scope-1 test-scope-2",
        });
    });

    it("test minimum config for third party provider apple", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = {
            keyId: "test-key",
            privateKey,
            teamId: "test-team-id",
        };

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Apple({
                                clientId,
                                clientSecret,
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "apple");
        let providerInfoGetResult = await providerInfo.get();
        assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, "https://appleid.apple.com/auth/token");
        assert.strictEqual(providerInfoGetResult.authorisationRedirect.url, "https://appleid.apple.com/auth/authorize");

        let accessTokenAPIParams = providerInfoGetResult.accessTokenAPI.params;

        assert(accessTokenAPIParams.client_id === clientId);
        assert(accessTokenAPIParams.client_secret !== undefined);
        assert(accessTokenAPIParams.grant_type === "authorization_code");

        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            scope: "email",
            response_mode: "form_post",
            response_type: "code",
        });
    });

    it("test passing additional params, check they are present in authorisation url for third party provider apple", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = {
            keyId: "test-key",
            privateKey,
            teamId: "test-team-id",
        };

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Apple({
                                clientId,
                                clientSecret,
                                authorisationRedirect: {
                                    params: {
                                        key1: "value1",
                                        key2: "value2",
                                    },
                                },
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "apple");
        let providerInfoGetResult = await providerInfo.get();
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            scope: "email",
            response_mode: "form_post",
            response_type: "code",
            key1: "value1",
            key2: "value2",
        });
    });

    it("test passing scopes in config for third party provider apple", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = {
            keyId: "test-key",
            privateKey,
            teamId: "test-team-id",
        };

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Apple({
                                clientId,
                                clientSecret,
                                scope: ["test-scope-1", "test-scope-2"],
                            }),
                        ],
                    },
                }),
            ],
        });

        let providerInfo = ThirPartyRecipe.getInstanceOrThrowError().providers[0];
        assert.strictEqual(providerInfo.id, "apple");
        let providerInfoGetResult = await providerInfo.get();
        assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
            client_id: "test",
            scope: "test-scope-1 test-scope-2",
            response_mode: "form_post",
            response_type: "code",
        });
    });

    it.skip("test passing invalid privateKey in config for third party provider apple", async function () {
        await startST();

        let clientId = "test";
        let clientSecret = {
            keyId: "test-key",
            privateKey: "invalidKey",
            teamId: "test-team-id",
        };
        try {
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
                    ThirPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirParty.Apple({
                                    clientId,
                                    clientSecret,
                                }),
                            ],
                        },
                    }),
                ],
            });
            assert(false);
        } catch (error) {
            if (error.type !== ThirParty.Error.BAD_INPUT_ERROR) {
                throw error;
            }
        }
    });

    it("test duplicate provider without any default", async function () {
        await startST();
        try {
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
                    ThirPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirParty.Google({
                                    clientId: "test",
                                    clientSecret: "test-secret",
                                    scope: ["test-scope-1", "test-scope-2"],
                                }),
                                ThirParty.Google({
                                    clientId: "test",
                                    clientSecret: "test-secret",
                                    scope: ["test-scope-1", "test-scope-2"],
                                }),
                            ],
                        },
                    }),
                ],
            });
            throw new Error("should fail");
        } catch (err) {
            assert(
                err.message ===
                    `The providers array has multiple entries for the same third party provider. Please mark one of them as the default one by using "isDefault: true".`
            );
        }
    });

    it("test duplicate provider with both default", async function () {
        await startST();
        try {
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
                    ThirPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirParty.Google({
                                    isDefault: true,
                                    clientId: "test",
                                    clientSecret: "test-secret",
                                    scope: ["test-scope-1", "test-scope-2"],
                                }),
                                ThirParty.Google({
                                    isDefault: true,
                                    clientId: "test",
                                    clientSecret: "test-secret",
                                    scope: ["test-scope-1", "test-scope-2"],
                                }),
                            ],
                        },
                    }),
                ],
            });
            throw new Error("should fail");
        } catch (err) {
            assert(
                err.message ===
                    `You have provided multiple third party providers that have the id: "google" and are marked as "isDefault: true". Please only mark one of them as isDefault.`
            );
        }
    });
    it("test duplicate provider with one default", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [
                            ThirParty.Google({
                                clientId: "test",
                                clientSecret: "test-secret",
                                scope: ["test-scope-1", "test-scope-2"],
                            }),
                            ThirParty.Google({
                                isDefault: true,
                                clientId: "test",
                                clientSecret: "test-secret",
                                scope: ["test-scope-1", "test-scope-2"],
                            }),
                        ],
                    },
                }),
            ],
        });
    });
});
