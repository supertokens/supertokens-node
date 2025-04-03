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

const { printPath, setupST, startSTWithMultitenancy, killAllST, cleanST, removeAppAndTenants } = require("../utils");
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

describe(`oidcTest: ${printPath("[test/thirdparty/oidc.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test the code challenge method is used if supported by the provider", async function () {
        const connectionURI = await startSTWithMultitenancy();

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
});
