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
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../../lib/build/querier");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let Multitenancy = require("../../recipe/multitenancy");
let EmailPassword = require("../../recipe/emailpassword");
let { middleware, errorHandler } = require("../../framework/express");

describe(`tenants-crud: ${printPath("[test/multitenancy/tenants-crud.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test creation of tenants", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { thirdPartyEnabled: true });

        const tenants = await Multitenancy.listAllTenants();
        assert(tenants.tenants.length === 4); // public + 3 tenants created above
    });

    it("test get tenant", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { thirdPartyEnabled: true });

        let tenantConfig = await Multitenancy.getTenant("t1");
        assert(tenantConfig.emailPassword.enabled === true);
        assert(tenantConfig.passwordless.enabled === false);
        assert(tenantConfig.thirdParty.enabled === false);
        assert(tenantConfig.coreConfig !== undefined);

        tenantConfig = await Multitenancy.getTenant("t2");
        assert(tenantConfig.passwordless.enabled === true);
        assert(tenantConfig.emailPassword.enabled === false);
        assert(tenantConfig.thirdParty.enabled === false);
        assert(tenantConfig.coreConfig !== undefined);

        tenantConfig = await Multitenancy.getTenant("t3");
        assert(tenantConfig.thirdParty.enabled === true);
        assert(tenantConfig.passwordless.enabled === false);
        assert(tenantConfig.emailPassword.enabled === false);
        assert(tenantConfig.coreConfig !== undefined);
    });

    it("test update tenant", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });

        let tenantConfig = await Multitenancy.getTenant("t1");
        assert(tenantConfig.emailPassword.enabled === true);
        assert(tenantConfig.passwordless.enabled === false);
        assert(tenantConfig.thirdParty.enabled === false);

        await Multitenancy.createOrUpdateTenant("t1", { passwordlessEnabled: true });
        tenantConfig = await Multitenancy.getTenant("t1");
        assert(tenantConfig.emailPassword.enabled === true);
        assert(tenantConfig.passwordless.enabled === true);

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: false });
        tenantConfig = await Multitenancy.getTenant("t1");
        assert(tenantConfig.emailPassword.enabled === false);
        assert(tenantConfig.passwordless.enabled === true);
    });

    it("test delete tenant", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { thirdPartyEnabled: true });

        let tenants = await Multitenancy.listAllTenants();
        assert(tenants.tenants.length === 4); // public + 3 tenants created above

        let response = await Multitenancy.deleteTenant("t3");
        assert(response.didExist === true);

        tenants = await Multitenancy.listAllTenants();
        assert(tenants.tenants.length === 3); // public + 3 tenants created above

        response = await Multitenancy.deleteTenant("t3");
        assert(response.didExist === false);
    });

    it("test creation of thirdParty config", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "google",
            clients: [{ clientId: "abcd" }],
        });

        const tenantConfig = await Multitenancy.getTenant("t1");

        assert(tenantConfig.thirdParty.providers.length === 1);
        assert(tenantConfig.thirdParty.providers[0].thirdPartyId === "google");
        assert(tenantConfig.thirdParty.providers[0].clients.length === 1);
        assert(tenantConfig.thirdParty.providers[0].clients[0].clientId === "abcd");
    });

    it("test creation of thirdParty config with nulls", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });

        const thirdPartyConfig = {
            thirdPartyId: "google",
            clients: [{ clientId: "abcd" }],
            authorizationEndpointQueryParams: {
                key1: null,
                key2: "value",
            },
            tokenEndpointBodyParams: {
                key1: null,
                key2: "value",
            },
            userInfoEndpointQueryParams: {
                key1: null,
                key2: "value",
            },
            userInfoEndpointHeaders: {
                key1: null,
                key2: "value",
            },
        };

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", thirdPartyConfig);

        const tenantConfig = await Multitenancy.getTenant("t1");

        assert(tenantConfig.thirdParty.providers.length === 1);
        assert(tenantConfig.thirdParty.providers[0].thirdPartyId === "google");
        assert(tenantConfig.thirdParty.providers[0].clients.length === 1);
        assert(tenantConfig.thirdParty.providers[0].clients[0].clientId === "abcd");
        assert.deepEqual(
            tenantConfig.thirdParty.providers[0].authorizationEndpointQueryParams,
            thirdPartyConfig.authorizationEndpointQueryParams
        );
        assert.deepEqual(
            tenantConfig.thirdParty.providers[0].tokenEndpointBodyParams,
            thirdPartyConfig.tokenEndpointBodyParams
        );
        assert.deepEqual(
            tenantConfig.thirdParty.providers[0].userInfoEndpointQueryParams,
            thirdPartyConfig.userInfoEndpointQueryParams
        );
        assert.deepEqual(
            tenantConfig.thirdParty.providers[0].userInfoEndpointHeaders,
            thirdPartyConfig.userInfoEndpointHeaders
        );
    });

    it("test deletion of thirdparty id", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "google",
            clients: [{ clientId: "abcd" }],
        });

        let tenantConfig = await Multitenancy.getTenant("t1");

        assert(tenantConfig.thirdParty.providers.length === 1);

        await Multitenancy.deleteThirdPartyConfig("t1", "google");

        tenantConfig = await Multitenancy.getTenant("t1");
        assert(tenantConfig.thirdParty.providers.length === 0);
    });

    it("test updation of thirdparty provider", async function () {
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
            recipeList: [Multitenancy.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "google",
            clients: [{ clientId: "abcd" }],
        });

        let tenantConfig = await Multitenancy.getTenant("t1");

        assert(tenantConfig.thirdParty.providers.length === 1);

        await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
            thirdPartyId: "google",
            name: "Custom name",
            clients: [{ clientId: "efgh" }],
        });

        tenantConfig = await Multitenancy.getTenant("t1");
        assert(tenantConfig.thirdParty.providers.length === 1);
        assert(tenantConfig.thirdParty.providers[0].thirdPartyId === "google");
        assert(tenantConfig.thirdParty.providers[0].name === "Custom name");
        assert(tenantConfig.thirdParty.providers[0].clients.length === 1);
        assert(tenantConfig.thirdParty.providers[0].clients[0].clientId === "efgh");
    });

    it("test user association and disassociation with tenants", async function () {
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
            recipeList: [Multitenancy.init(), EmailPassword.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { emailPasswordEnabled: true });

        const user = await EmailPassword.signUp("public", "test@example.com", "password1");
        const userId = user.user.loginMethods[0].recipeUserId;

        await Multitenancy.associateUserToTenant("t1", userId);
        await Multitenancy.associateUserToTenant("t2", userId);
        await Multitenancy.associateUserToTenant("t3", userId);

        let newUser = await SuperTokens.getUser(userId.getAsString());

        assert.strictEqual(newUser.loginMethods[0].tenantIds.length, 4); // public + 3 tenants created above

        await Multitenancy.disassociateUserFromTenant("t1", userId);
        await Multitenancy.disassociateUserFromTenant("t2", userId);
        await Multitenancy.disassociateUserFromTenant("t3", userId);

        newUser = await SuperTokens.getUser(userId.getAsString());

        assert(newUser.loginMethods[0].tenantIds.length === 1); // only public
    });
});
