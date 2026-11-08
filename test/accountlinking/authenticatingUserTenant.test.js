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
const { printPath, createCoreApplicationWithMultitenancyAndAccountLinking } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let AccountLinking = require("../../recipe/accountlinking");
let EmailPassword = require("../../recipe/emailpassword");
let Multitenancy = require("../../recipe/multitenancy");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let Session = require("../../recipe/session");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const email = "x@example.com";

async function setup() {
    const connectionURI = await createCoreApplicationWithMultitenancyAndAccountLinking();
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
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: async () => ({ shouldAutomaticallyLink: false }),
            }),
            EmailPassword.init(),
            Passwordless.init({
                contactMethod: "EMAIL",
                flowType: "USER_INPUT_CODE",
                emailDelivery: {
                    override: (original) => ({
                        ...original,
                        sendEmail: async () => {},
                    }),
                },
            }),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [{ config: { thirdPartyId: "google", clients: [{ clientId: "", clientSecret: "" }] } }],
                },
            }),
            Session.init(),
        ],
    });

    await Multitenancy.createOrUpdateTenant("t1", { firstFactors: ["emailpassword", "thirdparty", "otp-email"] });
    await Multitenancy.createOrUpdateTenant("t2", { firstFactors: ["emailpassword", "thirdparty", "otp-email"] });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
}

// A primary user whose login methods for `recipeId` only exist on t1, linked to a
// third-party login method that is shared with t2, so the core lists the primary
// user for t2 as well.
async function createPrimaryUserOnT1SharedWithT2(createLoginMethodOnT1) {
    const recipeUserId = await createLoginMethodOnT1();
    const primaryResp = await AccountLinking.createPrimaryUser(recipeUserId);
    assert.strictEqual(primaryResp.status, "OK");

    const tpResp = await ThirdParty.manuallyCreateOrUpdateUser("t1", "google", "tp-user", email, false);
    assert.strictEqual(tpResp.status, "OK");
    const linkResp = await AccountLinking.linkAccounts(tpResp.recipeUserId, primaryResp.user.id);
    assert.strictEqual(linkResp.status, "OK");
    const associateResp = await Multitenancy.associateUserToTenant("t2", tpResp.recipeUserId);
    assert.strictEqual(associateResp.status, "OK");

    return primaryResp.user;
}

describe(`getAuthenticatingUserAndAddToCurrentTenantIfRequired: ${printPath(
    "[test/accountlinking/authenticatingUserTenant.test.js]"
)}`, function () {
    beforeEach(function () {
        ProcessState.getInstance().reset();
    });

    it("emailpassword sign in on a tenant ignores a linked emailpassword login method from another tenant", async function () {
        const app = await setup();
        const primaryUser = await createPrimaryUserOnT1SharedWithT2(async () => {
            const resp = await EmailPassword.signUp("t1", email, "password1");
            assert.strictEqual(resp.status, "OK");
            return resp.recipeUserId;
        });

        const t2SignUp = await EmailPassword.signUp("t2", email, "password2");
        assert.strictEqual(t2SignUp.status, "OK");
        assert.notStrictEqual(t2SignUp.user.id, primaryUser.id);

        const res = await request(app)
            .post("/auth/t2/signin")
            .send({
                formFields: [
                    { id: "email", value: email },
                    { id: "password", value: "password2" },
                ],
            });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.user.id, t2SignUp.user.id);
    });

    it("emailpassword sign in on a tenant does not accept the password of a linked login method from another tenant", async function () {
        const app = await setup();
        await createPrimaryUserOnT1SharedWithT2(async () => {
            const resp = await EmailPassword.signUp("t1", email, "password1");
            assert.strictEqual(resp.status, "OK");
            return resp.recipeUserId;
        });

        const t2SignUp = await EmailPassword.signUp("t2", email, "password2");
        assert.strictEqual(t2SignUp.status, "OK");

        const res = await request(app)
            .post("/auth/t2/signin")
            .send({
                formFields: [
                    { id: "email", value: email },
                    { id: "password", value: "password1" },
                ],
            });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "WRONG_CREDENTIALS_ERROR");
    });

    it("passwordless sign in on a tenant ignores a linked passwordless login method from another tenant", async function () {
        const app = await setup();
        await createPrimaryUserOnT1SharedWithT2(async () => {
            const resp = await Passwordless.signInUp({ tenantId: "t1", email });
            assert.strictEqual(resp.status, "OK");
            return resp.recipeUserId;
        });

        const t2SignUp = await Passwordless.signInUp({ tenantId: "t2", email });
        assert.strictEqual(t2SignUp.status, "OK");
        assert.strictEqual(t2SignUp.createdNewRecipeUser, true);

        const code = await Passwordless.createCode({ tenantId: "t2", email });
        assert.strictEqual(code.status, "OK");

        const res = await request(app).post("/auth/t2/signinup/code/consume").send({
            preAuthSessionId: code.preAuthSessionId,
            deviceId: code.deviceId,
            userInputCode: code.userInputCode,
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.createdNewRecipeUser, false);
        assert.strictEqual(res.body.user.id, t2SignUp.user.id);
    });
});
