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
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
let { middleware, errorHandler } = require("../../framework/express");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`multitenant role: ${printPath("[test/userroles/multitenantRole.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test that different roles can be assigned for the same user for each tenant", async function () {
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
            recipeList: [Multitenancy.init(), SessionRecipe.init(), UserRolesRecipe.init(), EmailPassword.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { emailPasswordEnabled: true });

        const user = await EmailPassword.signUp("public", "test@example.com", "password1");
        const userId = user.user.id;
        const recipeUserId = user.user.loginMethods[0].recipeUserId;

        await Multitenancy.associateUserToTenant("t1", recipeUserId);
        await Multitenancy.associateUserToTenant("t2", recipeUserId);
        await Multitenancy.associateUserToTenant("t3", recipeUserId);

        await UserRolesRecipe.createNewRoleOrAddPermissions("role1", []);
        await UserRolesRecipe.createNewRoleOrAddPermissions("role2", []);
        await UserRolesRecipe.createNewRoleOrAddPermissions("role3", []);

        await UserRolesRecipe.addRoleToUser("t1", userId, "role1");
        await UserRolesRecipe.addRoleToUser("t1", userId, "role2");
        await UserRolesRecipe.addRoleToUser("t2", userId, "role2");
        await UserRolesRecipe.addRoleToUser("t2", userId, "role3");
        await UserRolesRecipe.addRoleToUser("t3", userId, "role3");
        await UserRolesRecipe.addRoleToUser("t3", userId, "role1");

        let rolesResponse = await UserRolesRecipe.getRolesForUser("t1", userId);
        assert(rolesResponse.roles.length === 2);
        assert(rolesResponse.roles.includes("role1"));
        assert(rolesResponse.roles.includes("role2"));

        rolesResponse = await UserRolesRecipe.getRolesForUser("t2", userId);
        assert(rolesResponse.roles.length === 2);
        assert(rolesResponse.roles.includes("role2"));
        assert(rolesResponse.roles.includes("role3"));

        rolesResponse = await UserRolesRecipe.getRolesForUser("t3", userId);
        assert(rolesResponse.roles.length === 2);
        assert(rolesResponse.roles.includes("role1"));
        assert(rolesResponse.roles.includes("role3"));
    });
});
