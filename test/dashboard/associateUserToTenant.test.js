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

describe(`User Dashboard associateUserToTenant: ${printPath("[test/dashboard/associateUserToTenant.test.js]")}`, () => {
    beforeEach(async () => {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that API associates a given userId to a given tenantId", async () => {
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

        const associateTenantToUserURL = "/auth/dashboard/api/tenants/user/associate";

        const user1 = await EmailPassword.signUp("public", "test@supertokens.com", "test12345");

        await Multitenancy.createOrUpdateTenant(tenantName, {
            emailPasswordEnabled: true,
        });

        let tenantInfoResponse = await new Promise((res) => {
            request(app)
                .put(associateTenantToUserURL)
                .set("Authorization", "Bearer testapikey")
                .set("Content-Type", "application/json")
                .send(JSON.stringify({ tenantId: tenantName, userId: user1.recipeUserId.getAsString() }))
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(tenantInfoResponse.status, "OK");
        assert.strictEqual(tenantInfoResponse.wasAlreadyAssociated, false);

        const updatedUser1 = await STExpress.getUser(user1.recipeUserId.getAsString());
        assert(updatedUser1.loginMethods[0].tenantIds.includes(tenantName));
    });

    it("Test that API throws an error if the tenant id or user id is not provided", async () => {
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

        const associateTenantToUserURL = "/auth/dashboard/api/tenants/user/associate";

        let responseStatus = 200;
        let tenantInfoResponse = await new Promise((res) => {
            request(app)
                .put(associateTenantToUserURL)
                .set("Authorization", "Bearer testapikey")
                .set("Content-Type", "application/json")
                .send(JSON.stringify({}))
                .end((err, response) => {
                    responseStatus = response.statusCode;
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(responseStatus, 400);
        assert.strictEqual(tenantInfoResponse.message, "Missing required parameter 'tenantId' or 'userId'");
    });

    it("Test that API returns error when userId is unknown", async () => {
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

        const associateTenantToUserURL = "/auth/dashboard/api/tenants/user/associate";

        let tenantInfoResponse = await new Promise((res) => {
            request(app)
                .put(associateTenantToUserURL)
                .set("Authorization", "Bearer testapikey")
                .set("Content-Type", "application/json")
                .send(JSON.stringify({ tenantId: "public", userId: "test" }))
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(tenantInfoResponse.status, "UNKNOWN_USER_ID_ERROR");
    });
});
