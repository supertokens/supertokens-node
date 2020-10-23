/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/sessionRecipe").default;
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");

/**
 * TODO: test that once the info is loaded, it doesn't query again
 */

describe(`Handshake: ${printPath("[test/handshake.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
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
            await Session.createNewSession("", {}, {});
            throw new Error("should not have come here");
        } catch (err) {
            if (err.type !== Session.Error.GENERAL_ERROR || err.message !== "No SuperTokens core available to query") {
                throw err;
            }
        }
    });

    it("successful handshake and update JWT", async function () {
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
        let info = await SessionRecipe.getInstanceOrThrowError().getHandshakeInfo();
        assert.equal(typeof info.jwtSigningPublicKey, "string");
        assert.equal(info.enableAntiCsrf, true);
        assert.equal(info.accessTokenBlacklistingEnabled, false);
        assert.equal(typeof info.jwtSigningPublicKeyExpiryTime, "number");
        SessionRecipe.getInstanceOrThrowError().updateJwtSigningPublicKeyInfo("hello", 100);
        let info2 = await SessionRecipe.getInstanceOrThrowError().getHandshakeInfo();
        assert.equal(info2.jwtSigningPublicKey, "hello");
        assert.equal(info2.jwtSigningPublicKeyExpiryTime, 100);
    });
});
