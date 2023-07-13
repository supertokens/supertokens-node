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
const { printPath, setupST, startSTWithMultitenancy, stopST, killAllST, cleanST, resetAll } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let ThirdParty = require("../../recipe/thirdparty");
let { middleware, errorHandler } = require("../../framework/express");
let Multitenancy = require("../../recipe/multitenancy");

describe(`multitenancy: ${printPath("[test/thirdparty/multitenancy.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test config for emailpassword module
    // Failure condition: passing custom data or data of invalid type/ syntax to the module
    it("test recipe functions", async function () {
        await startSTWithMultitenancy();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdParty.init()],
        });

        await Multitenancy.createOrUpdateTenant("t1", { thirdPartyEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { thirdPartyEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { thirdPartyEnabled: true });

        // Sign up
        let user1a = await ThirdParty.manuallyCreateOrUpdateUser("t1", "google", "googleid1", "test@example.com");
        let user1b = await ThirdParty.manuallyCreateOrUpdateUser("t1", "facebook", "fbid1", "test@example.com");
        let user2a = await ThirdParty.manuallyCreateOrUpdateUser("t2", "google", "googleid1", "test@example.com");
        let user2b = await ThirdParty.manuallyCreateOrUpdateUser("t2", "facebook", "fbid1", "test@example.com");
        let user3a = await ThirdParty.manuallyCreateOrUpdateUser("t3", "google", "googleid1", "test@example.com");
        let user3b = await ThirdParty.manuallyCreateOrUpdateUser("t3", "facebook", "fbid1", "test@example.com");

        assert.deepEqual(user1a.user.tenantIds, ["t1"]);
        assert.deepEqual(user1b.user.tenantIds, ["t1"]);
        assert.deepEqual(user2a.user.tenantIds, ["t2"]);
        assert.deepEqual(user2b.user.tenantIds, ["t2"]);
        assert.deepEqual(user3a.user.tenantIds, ["t3"]);
        assert.deepEqual(user3b.user.tenantIds, ["t3"]);

        // get user by id
        let gUser1a = await ThirdParty.getUserById(user1a.user.id);
        let gUser1b = await ThirdParty.getUserById(user1b.user.id);
        let gUser2a = await ThirdParty.getUserById(user2a.user.id);
        let gUser2b = await ThirdParty.getUserById(user2b.user.id);
        let gUser3a = await ThirdParty.getUserById(user3a.user.id);
        let gUser3b = await ThirdParty.getUserById(user3b.user.id);

        assert.deepEqual(gUser1a, user1a.user);
        assert.deepEqual(gUser1b, user1b.user);
        assert.deepEqual(gUser2a, user2a.user);
        assert.deepEqual(gUser2b, user2b.user);
        assert.deepEqual(gUser3a, user3a.user);
        assert.deepEqual(gUser3b, user3b.user);

        // get user by email
        let gUserByEmail1 = await ThirdParty.getUsersByEmail("t1", "test@example.com");
        let gUserByEmail2 = await ThirdParty.getUsersByEmail("t2", "test@example.com");
        let gUserByEmail3 = await ThirdParty.getUsersByEmail("t3", "test@example.com");

        assert(gUserByEmail1.length === 2);
        assert.deepEqual(gUserByEmail1[0], user1a.user);
        assert.deepEqual(gUserByEmail1[1], user1b.user);
        assert(gUserByEmail2.length === 2);
        assert.deepEqual(gUserByEmail2[0], user2a.user);
        assert.deepEqual(gUserByEmail2[1], user2b.user);
        assert(gUserByEmail3.length === 2);
        assert.deepEqual(gUserByEmail3[0], user3a.user);
        assert.deepEqual(gUserByEmail3[1], user3b.user);

        // get user by thirdparty id
        let gUserByThirdPartyId1 = await ThirdParty.getUserByThirdPartyInfo("t1", "google", "googleid1");
        let gUserByThirdPartyId2 = await ThirdParty.getUserByThirdPartyInfo("t1", "facebook", "fbid1");
        let gUserByThirdPartyId3 = await ThirdParty.getUserByThirdPartyInfo("t2", "google", "googleid1");
        let gUserByThirdPartyId4 = await ThirdParty.getUserByThirdPartyInfo("t2", "facebook", "fbid1");
        let gUserByThirdPartyId5 = await ThirdParty.getUserByThirdPartyInfo("t3", "google", "googleid1");
        let gUserByThirdPartyId6 = await ThirdParty.getUserByThirdPartyInfo("t3", "facebook", "fbid1");

        assert.deepEqual(gUserByThirdPartyId1, user1a.user);
        assert.deepEqual(gUserByThirdPartyId2, user1b.user);
        assert.deepEqual(gUserByThirdPartyId3, user2a.user);
        assert.deepEqual(gUserByThirdPartyId4, user2b.user);
        assert.deepEqual(gUserByThirdPartyId5, user3a.user);
        assert.deepEqual(gUserByThirdPartyId6, user3b.user);
    });

    it("test getProvider", async function () {
        await startSTWithMultitenancy();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdParty.init()],
        });

        await Multitenancy.createOrUpdateTenant("t1", { thirdPartyEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { thirdPartyEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { thirdPartyEnabled: true });

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "google",
            clients: [{ clientId: "a" }],
        });
        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "facebook",
            clients: [{ clientId: "a" }],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("t2", {
            thirdPartyId: "facebook",
            clients: [{ clientId: "a" }],
        });
        await Multitenancy.createOrUpdateThirdPartyConfig("t2", {
            thirdPartyId: "discord",
            clients: [{ clientId: "a" }],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("t3", {
            thirdPartyId: "discord",
            clients: [{ clientId: "a" }],
        });
        await Multitenancy.createOrUpdateThirdPartyConfig("t3", {
            thirdPartyId: "linkedin",
            clients: [{ clientId: "a" }],
        });

        let provider1 = await ThirdParty.getProvider("t1", "google", undefined);
        assert(provider1.provider.config.thirdPartyId === "google");

        let provider2 = await ThirdParty.getProvider("t1", "facebook", undefined);
        assert(provider2.provider.config.thirdPartyId === "facebook");

        let provider3 = await ThirdParty.getProvider("t2", "facebook", undefined);
        assert(provider3.provider.config.thirdPartyId === "facebook");

        let provider4 = await ThirdParty.getProvider("t2", "discord", undefined);
        assert(provider4.provider.config.thirdPartyId === "discord");

        let provider5 = await ThirdParty.getProvider("t3", "discord", undefined);
        assert(provider5.provider.config.thirdPartyId === "discord");

        let provider6 = await ThirdParty.getProvider("t3", "linkedin", undefined);
        assert(provider6.provider.config.thirdPartyId === "linkedin");
    });
});
