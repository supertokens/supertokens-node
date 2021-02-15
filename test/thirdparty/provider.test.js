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
const { printPath, setupST, startST, killAllST, cleanST, resetAll } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirPartyRecipe = require("../../lib/build/recipe/thirdParty/recipe").default;
let ThirParty = require("../../lib/build/recipe/thirdParty");

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
        assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, "https://accounts.google.com/o/oauth2/token");
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
            scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        });
    });
});
