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
const { printPath, setupST, startST, createServerlessCacheForTesting, killAllST, cleanST } = require("./utils");
let ST = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
const { maxVersion } = require("../lib/build/utils");
const { removeServerlessCache } = require("../lib/build/utils");

describe(`Handshake: ${printPath("[test/handshake.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test that once the info is loaded, it doesn't query again
    it("test that once the info is loaded, it doesn't querry again", async function () {
        await startST();
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        let sessionRecipeInstance = SessionRecipe.getInstanceOrThrowError();
        await sessionRecipeInstance.recipeInterfaceImpl.getHandshakeInfo();
        let verifyState = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO,
            2000
        );
        assert(verifyState !== undefined);

        ProcessState.getInstance().reset();

        await sessionRecipeInstance.recipeInterfaceImpl.getHandshakeInfo();
        verifyState = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO,
            2000
        );
        assert(verifyState === undefined);
    });

    it("core not available", async function () {
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
        try {
            await Session.revokeSession("");
            throw new Error("should not have come here");
        } catch (err) {
            if (err.message !== "No SuperTokens core available to query") {
                throw err;
            }
        }
    });

    it("successful handshake and update JWT without keyList", async function () {
        await startST();
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
        let info = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo();
        assert(info.jwtSigningPublicKeyList instanceof Array);
        assert.equal(info.jwtSigningPublicKeyList.length, 1);
        assert.strictEqual(info.antiCsrf, "NONE");
        assert.equal(info.accessTokenBlacklistingEnabled, false);
        assert.equal(info.accessTokenValidity, 3600 * 1000);
        assert.equal(info.refreshTokenValidity, 144000 * 60 * 1000);
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.updateJwtSigningPublicKeyInfo(
            undefined,
            "hello",
            100
        );
        let info2 = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo();
        assert.equal(info2.jwtSigningPublicKeyList.length, 1);
        assert.deepEqual(info2.jwtSigningPublicKeyList[0].publicKey, "hello");
        assert.deepEqual(info2.jwtSigningPublicKeyList[0].expiryTime, 100);
        assert(info2.jwtSigningPublicKeyList[0].createdAt > Date.now() - 100);
    });

    it("successful handshake and update JWT with keyList", async function () {
        await startST();
        ST.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });
        let info = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo();
        assert(info.jwtSigningPublicKeyList instanceof Array);
        assert.equal(info.jwtSigningPublicKeyList.length, 1);
        assert.strictEqual(info.antiCsrf, "NONE");
        assert.equal(info.accessTokenBlacklistingEnabled, false);
        assert.equal(info.accessTokenValidity, 3600 * 1000);
        assert.equal(info.refreshTokenValidity, 144000 * 60 * 1000);
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.updateJwtSigningPublicKeyInfo(
            [{ publicKey: "hello2", expiryTime: 100 }],
            "hello2",
            100
        );
        let info2 = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo();
        assert.deepEqual(info2.jwtSigningPublicKeyList, [{ publicKey: "hello2", expiryTime: 100 }]);
    });
});
