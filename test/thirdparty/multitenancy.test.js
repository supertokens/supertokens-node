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
const { printPath, setupST, startSTWithMultitenancy, killAllST, cleanST } = require("../utils");
let SuperTokens = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdParty = require("../../recipe/thirdparty");
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
        const connectionURI = await startSTWithMultitenancy();
        SuperTokens.init({
            supertokens: {
                connectionURI,
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
        let user1a = await ThirdParty.manuallyCreateOrUpdateUser(
            "t1",
            "google",
            "googleid1",
            "test@example.com",
            false
        );
        let user1b = await ThirdParty.manuallyCreateOrUpdateUser("t1", "facebook", "fbid1", "test@example.com", false);
        let user2a = await ThirdParty.manuallyCreateOrUpdateUser(
            "t2",
            "google",
            "googleid1",
            "test@example.com",
            false
        );
        let user2b = await ThirdParty.manuallyCreateOrUpdateUser("t2", "facebook", "fbid1", "test@example.com", false);
        let user3a = await ThirdParty.manuallyCreateOrUpdateUser(
            "t3",
            "google",
            "googleid1",
            "test@example.com",
            false
        );
        let user3b = await ThirdParty.manuallyCreateOrUpdateUser("t3", "facebook", "fbid1", "test@example.com", false);

        assert.deepEqual(user1a.user.loginMethods[0].tenantIds, ["t1"]);
        assert.deepEqual(user1b.user.loginMethods[0].tenantIds, ["t1"]);
        assert.deepEqual(user2a.user.loginMethods[0].tenantIds, ["t2"]);
        assert.deepEqual(user2b.user.loginMethods[0].tenantIds, ["t2"]);
        assert.deepEqual(user3a.user.loginMethods[0].tenantIds, ["t3"]);
        assert.deepEqual(user3b.user.loginMethods[0].tenantIds, ["t3"]);

        // get user by id
        let gUser1a = await SuperTokens.getUser(user1a.user.id);
        let gUser1b = await SuperTokens.getUser(user1b.user.id);
        let gUser2a = await SuperTokens.getUser(user2a.user.id);
        let gUser2b = await SuperTokens.getUser(user2b.user.id);
        let gUser3a = await SuperTokens.getUser(user3a.user.id);
        let gUser3b = await SuperTokens.getUser(user3b.user.id);

        assert.deepEqual(gUser1a.toJson(), user1a.user.toJson());
        assert.deepEqual(gUser1b.toJson(), user1b.user.toJson());
        assert.deepEqual(gUser2a.toJson(), user2a.user.toJson());
        assert.deepEqual(gUser2b.toJson(), user2b.user.toJson());
        assert.deepEqual(gUser3a.toJson(), user3a.user.toJson());
        assert.deepEqual(gUser3b.toJson(), user3b.user.toJson());
    });

    it("test getProvider", async function () {
        const connectionURI = await startSTWithMultitenancy();
        SuperTokens.init({
            supertokens: {
                connectionURI,
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
        assert(provider1.config.thirdPartyId === "google");

        let provider2 = await ThirdParty.getProvider("t1", "facebook", undefined);
        assert(provider2.config.thirdPartyId === "facebook");

        let provider3 = await ThirdParty.getProvider("t2", "facebook", undefined);
        assert(provider3.config.thirdPartyId === "facebook");

        let provider4 = await ThirdParty.getProvider("t2", "discord", undefined);
        assert(provider4.config.thirdPartyId === "discord");

        let provider5 = await ThirdParty.getProvider("t3", "discord", undefined);
        assert(provider5.config.thirdPartyId === "discord");

        let provider6 = await ThirdParty.getProvider("t3", "linkedin", undefined);
        assert(provider6.config.thirdPartyId === "linkedin");
    });

    it("test getProvider merges the config from static and core 1", async function () {
        const connectionURI = await startSTWithMultitenancy();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId: "staticclientid",
                                            clientSecret: "secret",
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                }),
            ],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            clients: [{ clientId: "coreclientid", clientSecret: "coresecret" }],
        });

        let thirdPartyInfo = await ThirdParty.getProvider("public", "google");
        assert.equal(thirdPartyInfo.config.clients[0].clientId, "coreclientid");
        assert.equal(thirdPartyInfo.config.clients[0].clientSecret, "coresecret");
    });

    it("test getProvider returns correct config from core", async function () {
        const connectionURI = await startSTWithMultitenancy();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdParty.init()],
        });

        await Multitenancy.createOrUpdateThirdPartyConfig("public", {
            thirdPartyId: "google",
            clients: [{ clientId: "coreclientid", clientSecret: "coresecret" }],
        });

        let thirdPartyInfo = await ThirdParty.getProvider("public", "google");
        assert.equal(thirdPartyInfo.config.clients[0].clientId, "coreclientid");
        assert.equal(thirdPartyInfo.config.clients[0].clientSecret, "coresecret");
        assert.deepEqual(
            {
                fromIdTokenPayload: { userId: "sub", email: "email", emailVerified: "email_verified" },
                fromUserInfoAPI: { userId: "sub", email: "email", emailVerified: "email_verified" },
            },
            thirdPartyInfo.config.userInfoMap
        );
    });
});
