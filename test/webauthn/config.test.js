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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let WebAuthn = require("../../recipe/webauthn");
let WebAuthnRecipe = require("../../lib/build/recipe/webauthn/recipe").default;
let utils = require("../../lib/build/recipe/webauthn/utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`configTest: ${printPath("[test/webauthn/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test config for emailpassword module
    // Failure condition: passing custom data or data of invalid type/ syntax to the module
    it("test default config for webauthn module", async function () {
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
            recipeList: [WebAuthn.init()],
            debug: true,
        });

        let webauthn = await WebAuthnRecipe.getInstanceOrThrowError();

        assert(!!webauthn);
        const origin = await webauthn.config.getOrigin({ userContext: {} });
        const relyingPartyId = await webauthn.config.getRelyingPartyId({ userContext: {} });
        const relyingPartyName = await webauthn.config.getRelyingPartyName({ userContext: {} });

        assert(origin === "https://supertokens.io");
        assert(relyingPartyId === "supertokens.io");
        assert(relyingPartyName === "SuperTokens");

        assert((await webauthn.config.validateEmailAddress("aaaaa")) === "Email is invalid");
        assert((await webauthn.config.validateEmailAddress("aaaaaa@aaaaaa")) === "Email is invalid");
        assert((await webauthn.config.validateEmailAddress("random  User   @randomMail.com")) === "Email is invalid");
        assert((await webauthn.config.validateEmailAddress("*@*")) === "Email is invalid");
        assert((await webauthn.config.validateEmailAddress("validmail@gmail.com")) === undefined);
        assert(
            (await webauthn.config.validateEmailAddress()) ===
                "Development bug: Please make sure the email field yields a string"
        );
    });

    // Failure condition: passing data of invalid type/ syntax to the module
    it("test config for webauthn module", async function () {
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
                WebAuthn.init({
                    getOrigin: () => {
                        return "testOrigin";
                    },
                    getRelyingPartyId: () => {
                        return "testId";
                    },
                    getRelyingPartyName: () => {
                        return "testName";
                    },
                    validateEmailAddress: (email) => {
                        return email === "test";
                    },
                }),
            ],
        });

        let webauthn = await WebAuthnRecipe.getInstanceOrThrowError();
        const origin = webauthn.config.getOrigin();
        const relyingPartyId = webauthn.config.getRelyingPartyId();
        const relyingPartyName = webauthn.config.getRelyingPartyName();

        assert(origin === "testOrigin");
        assert(relyingPartyId === "testId");
        assert(relyingPartyName === "testName");
        assert(await webauthn.config.validateEmailAddress("test"));
        assert(!(await webauthn.config.validateEmailAddress("test!")));
    });
});
