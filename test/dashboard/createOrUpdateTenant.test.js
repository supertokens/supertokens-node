/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
const { ProcessState } = require("../../lib/build/processState");
const { printPath, killAllST, setupST, cleanST, startSTWithMultitenancy } = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let Multitenancy = require("../../recipe/multitenancy");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let Session = require("../../recipe/session");
let assert = require("assert");

describe(`User Dashboard createOrUpdateTenant: ${printPath("[test/dashboard/createOrUpdateTenant.test.js]")}`, () => {
    beforeEach(async () => {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that API creates a new tenant with the given tenant id", async () => {
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
            recipeList: [
                Dashboard.init({
                    apiKey: "testapikey",
                }),
                EmailPassword.init(),
                Session.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const tenantName = "tenant1";

        const createTenantURL = "/auth/dashboard/api/tenant";

        let tenantInfoResponse = await new Promise((res) => {
            request(app)
                .post(createTenantURL)
                .set("Authorization", "Bearer testapikey")
                .set("Content-Type", "application/json")
                .send(JSON.stringify({ tenantId: tenantName }))
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(tenantInfoResponse.status, "OK");
        assert.strictEqual(tenantInfoResponse.createdNew, true);

        const tenant = await Multitenancy.getTenant(tenantName);
        assert.strictEqual(tenant.status, "OK");
    });

    it("Test that API updates a tenant with the given tenant id", async () => {
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
            recipeList: [
                Dashboard.init({
                    apiKey: "testapikey",
                }),
                EmailPassword.init(),
                Session.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const tenantName = "tenant1";

        await Multitenancy.createOrUpdateTenant(tenantName, {
            emailPasswordEnabled: true,
            thirdPartyEnabled: true,
        });

        const createTenantURL = "/auth/dashboard/api/tenant";

        let tenantInfoResponse = await new Promise((res) => {
            request(app)
                .post(createTenantURL)
                .set("Authorization", "Bearer testapikey")
                .set("Content-Type", "application/json")
                .send(JSON.stringify({ tenantId: tenantName, emailPasswordEnabled: false }))
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(tenantInfoResponse.status, "OK");
        assert.strictEqual(tenantInfoResponse.createdNew, false);

        const tenant = await Multitenancy.getTenant(tenantName);
        assert.strictEqual(tenant.status, "OK");
        assert.strictEqual(tenant.emailPassword.enabled, false);
    });
});
