/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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

/**
 * From CDI 5.7 the users/count response always carries `approximate` and `asOf`, and
 * tenant-scoped counts without includeRecipeIds are served from the core's ledger.
 * getUserCount keeps returning a number.
 */

const { ProcessState } = require("../../lib/build/processState");
const { printPath, createCoreApplication, isCDIVersionCompatible, getQuerierInstance } = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let assert = require("assert");
let Session = require("../../recipe/session");

async function initSTAndGetApp() {
    const connectionURI = await createCoreApplication();
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
    return app;
}

describe(`User Dashboard usersCountGet: ${printPath("[test/dashboard/usersCountGet.test.js]")}`, () => {
    beforeEach(async () => {
        ProcessState.getInstance().reset();
    });

    it("getUserCount parses the users/count response", async () => {
        await initSTAndGetApp();
        const hasCountMetadata = await isCDIVersionCompatible("5.7");

        for (let i = 0; i < 3; i++) {
            const signUpResponse = await EmailPassword.signUp("public", `test${i}@supertokens.com`, "abcd1234");
            assert.strictEqual(signUpResponse.status, "OK");
        }

        // Counts across all tenants and recipe-filtered counts are exact on every CDI version
        assert.strictEqual(await STExpress.getUserCount(), 3);
        assert.strictEqual(await STExpress.getUserCount(["emailpassword"], "public"), 3);

        // A tenant-scoped count may be served from the core's ledger on CDI >= 5.7 and lag behind
        const tenantCount = await STExpress.getUserCount(undefined, "public");
        assert.strictEqual(typeof tenantCount, "number");
        assert.ok(tenantCount >= 0 && tenantCount <= 3, `unexpected count ${tenantCount}`);

        const response = await getQuerierInstance().sendGetRequest(
            { path: "/<tenantId>/users/count", params: { tenantId: "public" } },
            {},
            {}
        );
        assert.strictEqual(response.status, "OK");
        assert.strictEqual(typeof response.count, "number");
        if (hasCountMetadata) {
            assert.strictEqual(typeof response.approximate, "boolean");
            assert.strictEqual(typeof response.asOf, "number");
        } else {
            assert.strictEqual(response.approximate, undefined);
            assert.strictEqual(response.asOf, undefined);
        }
    });

    it("the dashboard users count API returns the count as a number", async () => {
        const app = await initSTAndGetApp();

        const signUpResponse = await EmailPassword.signUp("public", "test@supertokens.com", "abcd1234");
        assert.strictEqual(signUpResponse.status, "OK");

        const countResponse = await new Promise((res, rej) => {
            request(app)
                .get("/auth/dashboard/api/users/count")
                .set("Authorization", "Bearer testapikey")
                .end((err, response) => (err ? rej(err) : res(JSON.parse(response.text))));
        });

        assert.strictEqual(countResponse.status, "OK");
        assert.strictEqual(typeof countResponse.count, "number");
        assert.deepStrictEqual(Object.keys(countResponse).sort(), ["count", "status"]);
        assert.ok(countResponse.count >= 0 && countResponse.count <= 1, `unexpected count ${countResponse.count}`);
    });
});
