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
let STExpress = require("../..");
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
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
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
});
