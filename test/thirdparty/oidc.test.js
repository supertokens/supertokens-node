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

const { printPath, createCoreApplicationWithMultitenancy } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let Multitenancy = require("../../lib/build/recipe/multitenancy");
let ThirdParty = require("../../lib/build/recipe/thirdparty");

describe(`oidcTest: ${printPath("[test/thirdparty/oidc.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    it("should use code challenge method S256 if supported by the provider", async function () {
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
            thirdPartyId: "custom-google",
            name: "Custom provider",
            clients: [
                {
                    clientId: "...",
                    clientSecret: "...",
                    scope: ["profile", "email"],
                },
            ],
            oidcDiscoveryEndpoint: "https://accounts.google.com/.well-known/openid-configuration",
            userInfoMap: {
                fromIdTokenPayload: {
                    userId: "id",
                    email: "email",
                    emailVerified: "email_verified",
                },
            },
        });

        const providerInfo = await ThirdParty.getProvider("public", "custom-google");
        assert.deepStrictEqual(providerInfo.config.codeChallengeMethodsSupported, ["plain", "S256"]);

        const authUrl = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "http://localhost:3000/callback",
        });
        assert.ok(authUrl.pkceCodeVerifier);
        const authUrlObject = new URL(authUrl.urlWithQueryParams);
        const codeChallengeMethod = authUrlObject.searchParams.get("code_challenge_method");
        const codeChallenge = authUrlObject.searchParams.get("code_challenge");

        // Check for existence of code_challenge and code_challenge_method
        assert.ok(codeChallenge);
        assert.ok(codeChallengeMethod);
        assert.strictEqual(codeChallengeMethod, "S256");
    });

    it("should not use pkce if oidc response does not support S256", async function () {
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
            thirdPartyId: "custom-fb",
            name: "Custom provider",
            clients: [
                {
                    clientId: "...",
                    clientSecret: "...",
                    scope: ["profile", "email"],
                },
            ],
            oidcDiscoveryEndpoint: "https://facebook.com/.well-known/openid-configuration",
            userInfoMap: {
                fromIdTokenPayload: {
                    userId: "id",
                    email: "email",
                    emailVerified: "email_verified",
                },
            },
        });

        const providerInfo = await ThirdParty.getProvider("public", "custom-fb");
        assert.deepStrictEqual(providerInfo.config.codeChallengeMethodsSupported, undefined);

        const authUrl = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "http://localhost:3000/callback",
        });
        assert.strictEqual(authUrl.urlWithQueryParams.includes("code_challenge"), false);
        assert.strictEqual(authUrl.urlWithQueryParams.includes("code_challenge_method"), false);
    });

    it("should use pkce if oidc response does not support S256 but forcePKCE is true", async function () {
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
            thirdPartyId: "custom-fb",
            name: "Custom provider",
            clients: [
                {
                    clientId: "...",
                    clientSecret: "...",
                    scope: ["profile", "email"],
                    forcePKCE: true,
                },
            ],
            oidcDiscoveryEndpoint: "https://facebook.com/.well-known/openid-configuration",
            userInfoMap: {
                fromIdTokenPayload: {
                    userId: "id",
                    email: "email",
                    emailVerified: "email_verified",
                },
            },
        });

        const providerInfo = await ThirdParty.getProvider("public", "custom-fb");
        assert.deepStrictEqual(providerInfo.config.codeChallengeMethodsSupported, undefined);

        const authUrl = await providerInfo.getAuthorisationRedirectURL({
            redirectURIOnProviderDashboard: "http://localhost:3000/callback",
        });
        assert.ok(authUrl.pkceCodeVerifier);
        const authUrlObject = new URL(authUrl.urlWithQueryParams);
        const codeChallengeMethod = authUrlObject.searchParams.get("code_challenge_method");
        const codeChallenge = authUrlObject.searchParams.get("code_challenge");

        // Check for existence of code_challenge and code_challenge_method
        assert.ok(codeChallenge);
        assert.ok(codeChallengeMethod);
        assert.strictEqual(codeChallengeMethod, "S256");
    });
});
