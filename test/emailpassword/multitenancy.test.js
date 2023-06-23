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
let EmailPassword = require("../../recipe/emailpassword");
let utils = require("../../lib/build/recipe/emailpassword/utils");
let { middleware, errorHandler } = require("../../framework/express");
let Multitenancy = require("../../recipe/multitenancy");

describe(`multitenancy: ${printPath("[test/emailpassword/multitenancy.test.js]")}`, function () {
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
            recipeList: [EmailPassword.init()],
        });

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { emailPasswordEnabled: true });

        // Sign up
        let user1 = await EmailPassword.signUp("test@example.com", "password1", "t1");
        let user2 = await EmailPassword.signUp("test@example.com", "password2", "t2");
        let user3 = await EmailPassword.signUp("test@example.com", "password3", "t3");

        assert(user1.user.id !== user2.user.id);
        assert(user1.user.id !== user3.user.id);
        assert(user2.user.id !== user3.user.id);

        assert.deepEqual(user1.user.tenantIds, ["t1"]);
        assert.deepEqual(user2.user.tenantIds, ["t2"]);
        assert.deepEqual(user3.user.tenantIds, ["t3"]);

        // Sign in
        let sUser1 = await EmailPassword.signIn("test@example.com", "password1", "t1");
        let sUser2 = await EmailPassword.signIn("test@example.com", "password2", "t2");
        let sUser3 = await EmailPassword.signIn("test@example.com", "password3", "t3");

        assert(sUser1.user.id === user1.user.id);
        assert(sUser2.user.id === user2.user.id);
        assert(sUser3.user.id === user3.user.id);

        // get user by id
        let gUser1 = await EmailPassword.getUserById(user1.user.id);
        let gUser2 = await EmailPassword.getUserById(user2.user.id);
        let gUser3 = await EmailPassword.getUserById(user3.user.id);

        assert.deepEqual(gUser1, user1.user);
        assert.deepEqual(gUser2, user2.user);
        assert.deepEqual(gUser3, user3.user);

        // get user by email
        let gUserByEmail1 = await EmailPassword.getUserByEmail("test@example.com", "t1");
        let gUserByEmail2 = await EmailPassword.getUserByEmail("test@example.com", "t2");
        let gUserByEmail3 = await EmailPassword.getUserByEmail("test@example.com", "t3");

        assert.deepEqual(gUserByEmail1, user1.user);
        assert.deepEqual(gUserByEmail2, user2.user);
        assert.deepEqual(gUserByEmail3, user3.user);

        // create password reset token
        let passwordResetLink1 = await EmailPassword.createResetPasswordToken(user1.user.id, "t1");
        let passwordResetLink2 = await EmailPassword.createResetPasswordToken(user2.user.id, "t2");
        let passwordResetLink3 = await EmailPassword.createResetPasswordToken(user3.user.id, "t3");

        assert(passwordResetLink1.token !== undefined);
        assert(passwordResetLink2.token !== undefined);
        assert(passwordResetLink3.token !== undefined);

        // reset password using token
        await EmailPassword.resetPasswordUsingToken(passwordResetLink1.token, "newpassword1", "t1");
        await EmailPassword.resetPasswordUsingToken(passwordResetLink2.token, "newpassword2", "t2");
        await EmailPassword.resetPasswordUsingToken(passwordResetLink3.token, "newpassword3", "t3");

        // new password should work
        sUser1 = await EmailPassword.signIn("test@example.com", "newpassword1", "t1");
        sUser2 = await EmailPassword.signIn("test@example.com", "newpassword2", "t2");
        sUser3 = await EmailPassword.signIn("test@example.com", "newpassword3", "t3");

        assert.deepEqual(sUser1.user, user1.user);
        assert.deepEqual(sUser2.user, user2.user);
        assert.deepEqual(sUser3.user, user3.user);
    });
});
