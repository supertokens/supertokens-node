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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig, resetAll } = require("../utils");
const assert = require("assert");
const SuperTokens = require("../..");
const Session = require("../../recipe/session");
const sinon = require("sinon");
const request = require("http");

describe(`JWKs caching: ${printPath("[test/session/jwksCache.test.js]")}`, function () {
    let requestMock;
    let clock;
    beforeEach(async function () {
        await killAllST();
        await setupST();

        requestMock.reset();
        requestMock.callThrough();
        if (clock) {
            clock.restore();
        }
    });

    before(() => {
        requestMock = sinon.stub(request, "get").callThrough();
    });

    after(async function () {
        requestMock.restore();
        await killAllST();
        await cleanST();
    });

    it("should fetch the keys as expected", async () => {
        clock = sinon.useFakeTimers({ shouldAdvanceTime: true, now: Date.now() });

        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        assert.strictEqual(requestMock.callCount, 0);
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 1);

        // we "wait" for 61 seconds to make the cache expire
        clock.tick(61000);
        assert.strictEqual(requestMock.callCount, 1);
    });

    it("should not re-fetch if the cache is available", async () => {
        clock = sinon.useFakeTimers({ shouldAdvanceTime: true, now: Date.now() });

        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        assert.strictEqual(requestMock.callCount, 0);
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 1);

        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        // we "wait" for 61 seconds to make the cache expire
        assert.strictEqual(requestMock.callCount, 1);
    });

    it("should re-fetch keys for unknown kid", async () => {
        const connectionURI = await startST({
            coreConfig: { access_token_dynamic_signing_key_update_interval: "0.001" },
        }); // 5 seconds is the update interval
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        // We create a new token
        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        assert.strictEqual(requestMock.callCount, 0);
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 1);

        // We wait for signing key to expire
        await new Promise((r) => setTimeout(r, 6000));

        const createResWithNewKey = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokensWithNewKey = createResWithNewKey.getAllSessionTokensDangerously();
        assert.ok(
            await Session.getSessionWithoutRequestResponse(tokensWithNewKey.accessToken, tokensWithNewKey.antiCsrfToken)
        );
        assert.strictEqual(requestMock.callCount, 2);

        assert.ok(
            await Session.getSessionWithoutRequestResponse(tokensWithNewKey.accessToken, tokensWithNewKey.antiCsrfToken)
        );
        assert.strictEqual(requestMock.callCount, 2);
    });

    it("should throw if jwks endpoint errors", async () => {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        // We create a new token
        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        // Check that the keys have not been loaded
        assert.strictEqual(requestMock.callCount, 0);
        requestMock.throws(new Error("fake network error"));
        try {
            await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken);
        } catch (err) {
            // This should not be a try refresh token error, this is expected to result in a 500
            if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                throw err;
            }
        }
        assert.strictEqual(requestMock.callCount, 1);
    });

    it("should re-fetch after the cache expires", async () => {
        clock = sinon.useFakeTimers({ shouldAdvanceTime: true, now: Date.now() });

        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        assert.strictEqual(requestMock.callCount, 0);
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 1);

        // This should be done using the cache
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 1);
        // we "wait" for 61 seconds to make the cache out-of-date
        clock.tick(61000);
        // This should re-fetch from the core
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 2);

        // This should be done using the cache
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 2);
    });

    it("jwks multiple cores work ok", async () => {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: `${connectionURI};http://localhost:8081`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        // We create a new token
        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        // Check that the keys have not been loaded
        assert.strictEqual(requestMock.callCount, 0);

        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 1);
    });

    it("jwks endpoint throwing should fall back to next core if fetching throws", async () => {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                // We are using two valid core values here, but make it throw below
                connectionURI: `${connectionURI};${connectionURI}`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
        await new Promise((r) => setTimeout(r, 300));

        // We create a new token
        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();

        // Check that the keys have not been loaded
        assert.strictEqual(requestMock.callCount, 0);
        requestMock.onFirstCall().throws(new Error("fake fetch error")).onSecondCall().callThrough();

        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        // we get 2 calls, since the first call throws
        assert.strictEqual(requestMock.callCount, 2);
    });

    it("jwks endpoint throwing should fall back to next core if fetching returns the wrong status/shape", async () => {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        const createRes = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = createRes.getAllSessionTokensDangerously();
        resetAll();

        // We've created a token and reset because if the response is malformed to a proper core request
        // The API immediately throws, meaning we couldn't have example.com in the list above,
        // meaning we have to use a separate config
        SuperTokens.init({
            supertokens: {
                connectionURI: `http://example.com;${connectionURI}`,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
        // Check that the keys have not been loaded
        assert.strictEqual(requestMock.callCount, 0);
        assert.ok(await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken));
        assert.strictEqual(requestMock.callCount, 2);
    });
});
