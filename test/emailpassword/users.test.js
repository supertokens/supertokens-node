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
const { printPath, createCoreApplication, signUPRequest } = require("../utils");
const { getUserCount, getUsersNewestFirst, getUsersOldestFirst } = require("../../lib/build");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let { middleware, errorHandler } = require("../../framework/express");
const express = require("express");

describe(`usersTest: ${printPath("[test/emailpassword/users.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    after(async function () {});

    it("test getUsersOldestFirst", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test00@gmail.com", "testPass123");
        await signUPRequest(app, "test01@gmail.com", "testPass123");
        await signUPRequest(app, "test02@gmail.com", "testPass123");
        await signUPRequest(app, "test03@gmail.com", "testPass123");
        await signUPRequest(app, "test04@gmail.com", "testPass123");

        let users = await getUsersOldestFirst({ tenantId: "public" });
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersOldestFirst({ tenantId: "public", limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test00@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersOldestFirst({ tenantId: "public", limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test01@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersOldestFirst({ tenantId: "public", limit: 5, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 3);
        assert.strictEqual(users.nextPaginationToken, undefined);

        try {
            await getUsersOldestFirst({ tenantId: "public", limit: 10, paginationToken: "invalid-pagination-token" });
            assert(false);
        } catch (err) {
            if (!err.message.includes("invalid pagination token")) {
                throw err;
            }
        }

        try {
            await getUsersOldestFirst({ tenantId: "public", limit: -1 });
            assert(false);
        } catch (err) {
            if (!err.message.includes("limit must a positive integer with min value 1")) {
                throw err;
            }
        }
    });

    it("test getUsersOldestFirst with search queries", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const cdiVersion = await Querier.getNewInstanceOrThrowError("emailpassword").getAPIVersion();
        if (maxVersion("2.20", cdiVersion) !== cdiVersion) {
            return;
        }

        await signUPRequest(app, "test10@gmail.com", "testPass123");
        await signUPRequest(app, "test11@gmail.com", "testPass123");
        await signUPRequest(app, "test12@gmail.com", "testPass123");
        await signUPRequest(app, "test13@gmail.com", "testPass123");
        await signUPRequest(app, "john1@gmail.com", "testPass123");

        let users = await getUsersOldestFirst({ tenantId: "public", query: { email: "doe" } });
        assert.strictEqual(users.users.length, 0);

        users = await getUsersOldestFirst({ tenantId: "public", query: { email: "john" } });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "john1@gmail.com");
        assert.strictEqual(users.users[0].phoneNumbers[0], undefined);
        assert.strictEqual(users.users[0].thirdParty[0], undefined);
        assert.strictEqual(users.users[0].loginMethods[0].email, "john1@gmail.com");
        assert.strictEqual(users.users[0].loginMethods[0].phoneNumber, undefined);
        assert.strictEqual(users.users[0].loginMethods[0].thirdParty, undefined);
    });

    it("test getUsersNewestFirst", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test20@gmail.com", "testPass123");
        await signUPRequest(app, "test21@gmail.com", "testPass123");
        await signUPRequest(app, "test22@gmail.com", "testPass123");
        await signUPRequest(app, "test23@gmail.com", "testPass123");
        await signUPRequest(app, "test24@gmail.com", "testPass123");

        let users = await getUsersNewestFirst({ tenantId: "public" });
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersNewestFirst({ tenantId: "public", limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test24@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersNewestFirst({ tenantId: "public", limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test23@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersNewestFirst({ tenantId: "public", limit: 5, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 3);
        assert.strictEqual(users.nextPaginationToken, undefined);

        try {
            await getUsersOldestFirst({ tenantId: "public", limit: 10, paginationToken: "invalid-pagination-token" });
            assert(false);
        } catch (err) {
            if (!err.message.includes("invalid pagination token")) {
                throw err;
            }
        }

        try {
            await getUsersOldestFirst({ tenantId: "public", limit: -1 });
            assert(false);
        } catch (err) {
            if (!err.message.includes("limit must a positive integer with min value 1")) {
                throw err;
            }
        }
    });

    it("test getUsersNewestFirst with search queries", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const cdiVersion = await Querier.getNewInstanceOrThrowError("emailpassword").getAPIVersion();
        if (maxVersion("2.20", cdiVersion) !== cdiVersion) {
            return;
        }

        await signUPRequest(app, "test30@gmail.com", "testPass123");
        await signUPRequest(app, "test31@gmail.com", "testPass123");
        await signUPRequest(app, "test32@gmail.com", "testPass123");
        await signUPRequest(app, "test33@gmail.com", "testPass123");
        await signUPRequest(app, "john3@gmail.com", "testPass123");

        let users = await getUsersNewestFirst({ tenantId: "public", query: { email: "doe" } });
        assert.strictEqual(users.users.length, 0);

        users = await getUsersNewestFirst({ tenantId: "public", query: { email: "john" } });
        assert.strictEqual(users.users.length, 1);
    });

    it("test getUserCount", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        let userCount = await getUserCount();
        assert.strictEqual(userCount, 0);

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test@gmail.com", "testPass123");
        userCount = await getUserCount();
        assert.strictEqual(userCount, 1);

        await signUPRequest(app, "test40@gmail.com", "testPass123");
        await signUPRequest(app, "test41@gmail.com", "testPass123");
        await signUPRequest(app, "test42@gmail.com", "testPass123");
        await signUPRequest(app, "test43@gmail.com", "testPass123");

        userCount = await getUserCount();
        assert.strictEqual(userCount, 5);
    });
});
