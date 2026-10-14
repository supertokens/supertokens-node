/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
const assert = require("assert");
const { printPath, createCoreApplicationWithMultitenancy } = require("../../utils");
const SuperTokens = require("../../..");
const Session = require("../../../recipe/session");
const EmailPassword = require("../../../recipe/emailpassword");
const UserRoles = require("../../../recipe/userroles");
const Multitenancy = require("../../../recipe/multitenancy");
const { ProcessState } = require("../../../lib/build/processState");

describe(`validateClaimsForSessionHandle tenant: ${printPath(
    "[test/session/claims/validateClaimsForSessionHandleTenant.test.js]"
)}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
        const connectionURI = await createCoreApplicationWithMultitenancy();
        SuperTokens.init({
            supertokens: { connectionURI },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                // roles are not added at session creation, so validating the claim has to fetch them
                UserRoles.init({ skipAddingRolesToAccessToken: true, skipAddingPermissionsToAccessToken: true }),
                Session.init({ getTokenTransferMethod: () => "header" }),
            ],
        });

        await Multitenancy.createOrUpdateTenant("t1", { firstFactors: ["emailpassword"] });
        await UserRoles.createNewRoleOrAddPermissions("admin", []);
    });

    async function createSessionInTenant(tenantId) {
        const signUpRes = await EmailPassword.signUp(tenantId, "user@example.com", "password123");
        assert.strictEqual(signUpRes.status, "OK");
        const user = signUpRes.user;
        const session = await Session.createNewSessionWithoutRequestResponse(
            tenantId,
            user.loginMethods[0].recipeUserId
        );
        return { user, session };
    }

    it("fetches the claim value for the session's tenant", async function () {
        const { user, session } = await createSessionInTenant("t1");
        await UserRoles.addRoleToUser("t1", user.id, "admin");

        const res = await Session.validateClaimsForSessionHandle(session.getHandle(), () => [
            UserRoles.UserRoleClaim.validators.includes("admin"),
        ]);

        assert.strictEqual(res.status, "OK");
        assert.deepStrictEqual(res.invalidClaims, []);

        const sessionInfo = await Session.getSessionInformation(session.getHandle());
        assert.deepStrictEqual(
            UserRoles.UserRoleClaim.getValueFromPayload(sessionInfo.customClaimsInAccessTokenPayload),
            ["admin"]
        );
        assert.strictEqual(sessionInfo.tenantId, "t1");
        assert.strictEqual(sessionInfo.customClaimsInAccessTokenPayload.tId, undefined);
    });

    it("does not use the roles of the public tenant for a session in another tenant", async function () {
        const { user, session } = await createSessionInTenant("t1");
        await Multitenancy.associateUserToTenant("public", user.loginMethods[0].recipeUserId);
        await UserRoles.addRoleToUser("public", user.id, "admin");

        const res = await Session.validateClaimsForSessionHandle(session.getHandle(), () => [
            UserRoles.UserRoleClaim.validators.includes("admin"),
        ]);

        assert.strictEqual(res.status, "OK");
        assert.strictEqual(res.invalidClaims.length, 1);
        assert.strictEqual(res.invalidClaims[0].id, UserRoles.UserRoleClaim.key);
    });

    it("still fetches the claim value for a session in the public tenant", async function () {
        const { user, session } = await createSessionInTenant("public");
        await UserRoles.addRoleToUser("public", user.id, "admin");

        const res = await Session.validateClaimsForSessionHandle(session.getHandle(), () => [
            UserRoles.UserRoleClaim.validators.includes("admin"),
        ]);

        assert.strictEqual(res.status, "OK");
        assert.deepStrictEqual(res.invalidClaims, []);
    });
});
