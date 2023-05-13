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
const {
    printPath,
    setupST,
    startST,
    stopST,
    killAllST,
    cleanST,
    resetAll,
    signUPRequest,
    extractInfoFromResponse,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../dist/recipe/session");
let SessionRecipe = require("../../dist/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../dist/processState");
let { normaliseURLPathOrThrowError } = require("../../dist/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../dist/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../dist/recipe/session/utils");
const { Querier } = require("../../dist/querier");
let EmailPassword = require("../../dist/recipe/emailpassword");
let EmailPasswordRecipe = require("../../dist/recipe/emailpassword/recipe").default;
let utils = require("../../dist/recipe/emailpassword/utils");
const express = require("express");
const request = require("supertest");
const { default: NormalisedURLPath } = require("../../dist/normalisedURLPath");
let { middleware, errorHandler } = require("../../dist/framework/express");
let { maxVersion } = require("../../dist/utils");

describe(`deleteUser: ${printPath("[test/emailpassword/deleteUser.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test deleteUser", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.10", cdiVersion) === cdiVersion) {
            let user = await EmailPassword.signUp("test@example.com", "1234abcd");

            {
                let response = await STExpress.getUsersOldestFirst();
                assert(response.users.length === 1);
            }

            await STExpress.deleteUser(user.user.id);

            {
                let response = await STExpress.getUsersOldestFirst();
                assert(response.users.length === 0);
            }
        }
    });
});
