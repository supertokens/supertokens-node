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
let SuperTokens = require("../../");
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
            recipeList: [EmailPassword.init()],
        });

        await Multitenancy.createOrUpdateTenant("t1", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { emailPasswordEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { emailPasswordEnabled: true });

        // Sign up
        let user1 = await EmailPassword.signUp("t1", "test@example.com", "password1");
        let user2 = await EmailPassword.signUp("t2", "test@example.com", "password2");
        let user3 = await EmailPassword.signUp("t3", "test@example.com", "password3");

        assert(user1.user.id !== user2.user.id);
        assert(user1.user.id !== user3.user.id);
        assert(user2.user.id !== user3.user.id);

        assert.deepEqual(user1.user.loginMethods[0].tenantIds, ["t1"]);
        assert.deepEqual(user2.user.loginMethods[0].tenantIds, ["t2"]);
        assert.deepEqual(user3.user.loginMethods[0].tenantIds, ["t3"]);

        // Sign in
        let sUser1 = await EmailPassword.signIn("t1", "test@example.com", "password1");
        let sUser2 = await EmailPassword.signIn("t2", "test@example.com", "password2");
        let sUser3 = await EmailPassword.signIn("t3", "test@example.com", "password3");

        assert(sUser1.user.id === user1.user.id);
        assert(sUser2.user.id === user2.user.id);
        assert(sUser3.user.id === user3.user.id);

        // get user by id
        let gUser1 = await SuperTokens.getUser(user1.user.id);
        let gUser2 = await SuperTokens.getUser(user2.user.id);
        let gUser3 = await SuperTokens.getUser(user3.user.id);

        assert.deepEqual(gUser1.toJson(), user1.user.toJson());
        assert.deepEqual(gUser2.toJson(), user2.user.toJson());
        assert.deepEqual(gUser3.toJson(), user3.user.toJson());

        // create password reset token
        let passwordResetLink1 = await EmailPassword.createResetPasswordToken("t1", user1.user.id, "test@example.com");
        let passwordResetLink2 = await EmailPassword.createResetPasswordToken("t2", user2.user.id, "test@example.com");
        let passwordResetLink3 = await EmailPassword.createResetPasswordToken("t3", user3.user.id, "test@example.com");

        assert(passwordResetLink1.token !== undefined);
        assert(passwordResetLink2.token !== undefined);
        assert(passwordResetLink3.token !== undefined);

        // reset password using token
        const consumeRes1 = await EmailPassword.consumePasswordResetToken("t1", passwordResetLink1.token);
        const consumeRes2 = await EmailPassword.consumePasswordResetToken("t2", passwordResetLink2.token);
        const consumeRes3 = await EmailPassword.consumePasswordResetToken("t3", passwordResetLink3.token);

        assert.strictEqual(consumeRes1.status, "OK");
        assert.strictEqual(consumeRes2.status, "OK");
        assert.strictEqual(consumeRes3.status, "OK");

        await EmailPassword.updateEmailOrPassword({
            recipeUserId: user1.user.loginMethods[0].recipeUserId,
            email: "test@example.com",
            password: "newpassword1",
            tenantIdForPasswordPolicy: "t1",
        });

        await EmailPassword.updateEmailOrPassword({
            recipeUserId: user2.user.loginMethods[0].recipeUserId,
            email: "test@example.com",
            password: "newpassword2",
            tenantIdForPasswordPolicy: "t2",
        });
        await EmailPassword.updateEmailOrPassword({
            recipeUserId: user3.user.loginMethods[0].recipeUserId,
            email: "test@example.com",
            password: "newpassword3",
        });

        // new password should work
        sUser1 = await EmailPassword.signIn("t1", "test@example.com", "newpassword1");
        sUser2 = await EmailPassword.signIn("t2", "test@example.com", "newpassword2");
        sUser3 = await EmailPassword.signIn("t3", "test@example.com", "newpassword3");

        assert.strictEqual(sUser1.status, "OK");
        assert.strictEqual(sUser2.status, "OK");
        assert.strictEqual(sUser3.status, "OK");

        assert.deepEqual(sUser1.user.toJson(), user1.user.toJson());
        assert.deepEqual(sUser2.user.toJson(), user2.user.toJson());
        assert.deepEqual(sUser3.user.toJson(), user3.user.toJson());
    });
});
