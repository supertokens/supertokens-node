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
    killAllST,
    cleanST,
    signInUPCustomRequest,
    isCDIVersionCompatible,
} = require("../utils");
const { getUserCount, getUsersNewestFirst, getUsersOldestFirst } = require("../../lib/build/");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let ThirdPartyPasswordless = require("../../lib/build/recipe/thirdpartypasswordless");
let { middleware, errorHandler } = require("../../framework/express");

describe(`usersTest: ${printPath("[test/thirdpartypasswordless/users.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: authCodeResponse.id,
                            email: {
                                id: authCodeResponse.email,
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
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
            recipeList: [
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signInUPCustomRequest(app, "test@gmail.com", "testPass0");
        await signInUPCustomRequest(app, "test1@gmail.com", "testPass1");
        await signInUPCustomRequest(app, "test2@gmail.com", "testPass2");
        await signInUPCustomRequest(app, "test3@gmail.com", "testPass3");
        await signInUPCustomRequest(app, "test4@gmail.com", "testPass4");

        let users = await getUsersOldestFirst();
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersOldestFirst({ limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].user.email, "test@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersOldestFirst({ limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].user.email, "test1@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersOldestFirst({ limit: 5, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 3);
        assert.strictEqual(users.nextPaginationToken, undefined);

        try {
            await getUsersOldestFirst({ limit: 10, paginationToken: "invalid-pagination-token" });
            assert(false);
        } catch (err) {
            if (!err.message.includes("invalid pagination token")) {
                throw err;
            }
        }

        try {
            await getUsersOldestFirst({ limit: -1 });
            assert(false);
        } catch (err) {
            if (!err.message.includes("limit must a positive integer with min value 1")) {
                throw err;
            }
        }
    });

    it("test getUsersNewestFirst", async function () {
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
            recipeList: [
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signInUPCustomRequest(app, "test@gmail.com", "testPass0");
        await signInUPCustomRequest(app, "test1@gmail.com", "testPass1");
        await signInUPCustomRequest(app, "test2@gmail.com", "testPass2");
        await signInUPCustomRequest(app, "test3@gmail.com", "testPass3");
        await signInUPCustomRequest(app, "test4@gmail.com", "testPass4");

        let users = await getUsersNewestFirst();
        assert.strictEqual(users.users.length, 5);
        assert.strictEqual(users.nextPaginationToken, undefined);

        users = await getUsersNewestFirst({ limit: 1 });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].user.email, "test4@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersNewestFirst({ limit: 1, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 1);
        assert.strictEqual(users.users[0].user.email, "test3@gmail.com");
        assert.strictEqual(typeof users.nextPaginationToken, "string");

        users = await getUsersNewestFirst({ limit: 5, paginationToken: users.nextPaginationToken });
        assert.strictEqual(users.users.length, 3);
        assert.strictEqual(users.nextPaginationToken, undefined);

        try {
            await getUsersOldestFirst({ limit: 10, paginationToken: "invalid-pagination-token" });
            assert(false);
        } catch (err) {
            if (!err.message.includes("invalid pagination token")) {
                throw err;
            }
        }

        try {
            await getUsersOldestFirst({ limit: -1 });
            assert(false);
        } catch (err) {
            if (!err.message.includes("limit must a positive integer with min value 1")) {
                throw err;
            }
        }
    });

    it("test getUserCount", async function () {
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
            recipeList: [
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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
