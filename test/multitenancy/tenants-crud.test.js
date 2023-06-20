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
const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../../lib/build/querier");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let Multitenancy = require("../../recipe/multitenancy");
let { middleware, errorHandler } = require("../../framework/express");

describe(`tenants-crud: ${printPath("[test/multitenancy/tenants-crud.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test creation of tenants", async function () {
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { thirdPartyEnabled: true });

        const tenants = await Multitenancy.listAllTenants();
        assert(tenants.tenants.length === 4); // public + 3 tenants created above
    });
});
