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
const { printPath, setupST, startST, killAllST, cleanST, signInUPCustomRequest } = require("../utils");
const { getUserCount, getUsersNewestFirst, getUsersOldestFirst } = require("../../lib/build/");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let ThirPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let { middleware, errorHandler } = require("../../framework/express");

describe(`usersTest: ${printPath("[test/thirdparty/users.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function ({ oAuthTokens }) {
                        return {
                            thirdPartyUserId: oAuthTokens.id,
                            email: {
                                id: oAuthTokens.email,
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };
    });

    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test getUsersOldestFirst", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signInUPCustomRequest(app, "test@gmail.com", "testPass0");
        await signInUPCustomRequest(app, "test1@gmail.com", "testPass1");
        await signInUPCustomRequest(app, "test2@gmail.com", "testPass2");
        await signInUPCustomRequest(app, "test3@gmail.com", "testPass3");
        await signInUPCustomRequest(app, "test4@gmail.com", "testPass4");

        let users = await getUsersOldestFirst({ tenantId: "public" });
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersOldestFirst({ tenantId: "public", limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersOldestFirst({ tenantId: "public", limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test1@gmail.com");
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

    it("test getUsersNewestFirst", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signInUPCustomRequest(app, "test@gmail.com", "testPass0");
        await signInUPCustomRequest(app, "test1@gmail.com", "testPass1");
        await signInUPCustomRequest(app, "test2@gmail.com", "testPass2");
        await signInUPCustomRequest(app, "test3@gmail.com", "testPass3");
        await signInUPCustomRequest(app, "test4@gmail.com", "testPass4");

        let users = await getUsersNewestFirst({ tenantId: "public" });
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersNewestFirst({ tenantId: "public", limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test4@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersNewestFirst({ tenantId: "public", limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].emails[0], "test3@gmail.com");
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

    it("test getUserCount", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let userCount = await getUserCount();
        assert.strictEqual(userCount, 0);

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signInUPCustomRequest(app, "test@gmail.com", "testPass0");
        userCount = await getUserCount();
        assert.strictEqual(userCount, 1);

        await signInUPCustomRequest(app, "test1@gmail.com", "testPass1");
        await signInUPCustomRequest(app, "test2@gmail.com", "testPass2");
        await signInUPCustomRequest(app, "test3@gmail.com", "testPass3");
        await signInUPCustomRequest(app, "test4@gmail.com", "testPass4");

        userCount = await getUserCount();
        assert.strictEqual(userCount, 5);
    });
});
