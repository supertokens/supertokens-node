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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("./utils");
let ST = require("../lib/build/session");
let STExpress = require("../index");
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");
let { CookieConfig } = require("../lib/build/cookieAndHeaders");
let {
    normaliseURLPathOrThrowError,
    normaliseSessionScopeOrThrowError,
    normaliseURLDomainOrThrowError,
} = require("../lib/build/utils");
const { Querier } = require("../lib/build/querier");
const { SessionConfig } = require("../lib/build/session");

/**
 *
 * TODO: Check that querier has been inited when we call supertokens.init
 * TODO: Check that modules have been inited when we call supertokens.init
 * TODO: Test various inputs to routing (if it accepts or not)
 *          - including when the base path is "/"
 *          - with and without a rId
 *          - where we do not have to handle it and it skips it (with / without rId)
 * TODO: Test various inputs to errorHandler (if it accepts or not)
 * TODO: Check that access control allow headers have the right set values for each recipe, including one for rid
 */

describe(`recipeModuleManagerTest: ${printPath("[test/recipeModuleManager.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });
});
