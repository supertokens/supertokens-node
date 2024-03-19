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

describe(`User Dashboard createOrUpdateThirdPartyConfig: ${printPath(
    "[test/dashboard/createOrUpdateThirdPartyConfig.test.js]"
)}`, () => {
    beforeEach(async () => {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that API creates a new third party config for the given tenant", async () => {
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

        const createThirdPartyConfigURL = "/auth/dashboard/api/tenants/third-party";

        let thirdPartyConfigResponse = await new Promise((res) => {
            request(app)
                .put(createThirdPartyConfigURL)
                .set("Authorization", "Bearer testapikey")
                .set("Content-Type", "application/json")
                .send(
                    JSON.stringify({
                        tenantId: tenantName,
                        providerConfig: {
                            thirdPartyId: "google",
                            name: "google",
                            clients: [
                                {
                                    clientId: "GOOGLE_CLIENT_ID",
                                    clientSecret: "GOOGLE_CLIENT_SECRET",
                                },
                            ],
                        },
                    })
                )
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(thirdPartyConfigResponse.status, "OK");
        assert.strictEqual(thirdPartyConfigResponse.createdNew, true);

        const tenant = await Multitenancy.getTenant(tenantName);
        assert.strictEqual(tenant.thirdParty.providers.length, 1);
        assert.strictEqual(tenant.thirdParty.providers[0].thirdPartyId, "google");
    });
});
