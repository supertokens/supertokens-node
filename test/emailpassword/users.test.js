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
const { printPath, createCoreApplication, signUPRequest, resetAll } = require("../utils");
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
        resetAll();
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

        const randomValue = Math.random();
        const emails = [
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
        ];
        for await (const [i, email] of emails.entries()) {
            await signUPRequest(app, email, `testPass-${randomValue}-${i}` + randomValue + i);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        let users = await getUsersOldestFirst({ tenantId: "public" });
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersOldestFirst({ tenantId: "public", limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], emails[0]);
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersOldestFirst({ tenantId: "public", limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], emails[1]);
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

        const randomValue = Math.random();
        const emails = [
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
        ];
        for await (const [i, email] of emails.entries()) {
            await signUPRequest(app, email, `testPass-${randomValue}-${i}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await signUPRequest(app, "john@gmail.com", `testPass-${randomValue}-4`);

        let users = await getUsersOldestFirst({ tenantId: "public", query: { email: "doe" } });
        assert.strictEqual(users.users.length, 0);

        users = await getUsersOldestFirst({ tenantId: "public", query: { email: "john" } });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "john@gmail.com");
        assert.strictEqual(users.users[0].phoneNumbers[0], undefined);
        assert.strictEqual(users.users[0].thirdParty[0], undefined);
        assert.strictEqual(users.users[0].loginMethods[0].email, "john@gmail.com");
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

        const randomValue = Math.random();
        const emails = [
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
        ];
        for await (const [i, email] of emails.entries()) {
            await signUPRequest(app, email, `testPass-${randomValue}-${i}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        let users = await getUsersNewestFirst({ tenantId: "public" });
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersNewestFirst({ tenantId: "public", limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], emails[emails.length - 1]);
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersNewestFirst({ tenantId: "public", limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], emails[emails.length - 2]);
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

        const randomValue = Math.random();
        const emails = [
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
        ];
        for await (const [i, email] of emails.entries()) {
            await signUPRequest(app, email, `testPass-${randomValue}-${i}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await signUPRequest(app, "john3@gmail.com", `testPass-${randomValue}-4`);

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

        await signUPRequest(app, "test@gmail.com", "testPass-${randomValue}-4");
        userCount = await getUserCount();
        assert.strictEqual(userCount, 1);

        const randomValue = Math.random();
        const emails = [
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
            Math.random() + "@gmail.com",
        ];
        for await (const [i, email] of emails.entries()) {
            await signUPRequest(app, email, `testPass-${randomValue}-${i}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        userCount = await getUserCount();
        assert.strictEqual(userCount, 5);
    });
});
