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
let WebAuthn = require("../../recipe/webauthn");
const createSoftAuthenticator = require("../webauthn/lib/softAuthenticator");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const email = "x@example.com";

// Must be a consistent pair: the core checks that the origin host ends with the relying party id.
const RP_ID = "supertokens.io";
const ORIGIN = "https://supertokens.io";

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
            WebAuthn.init({
                getRelyingPartyId: async () => RP_ID,
                getOrigin: async () => ORIGIN,
            }),
            Session.init(),
        ],
    });

    const firstFactors = ["emailpassword", "thirdparty", "otp-email", "webauthn"];
    await Multitenancy.createOrUpdateTenant("t1", { firstFactors });
    await Multitenancy.createOrUpdateTenant("t2", { firstFactors });

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

    it("passwordless createCode on a tenant ignores a linked passwordless login method from another tenant", async function () {
        const app = await setup();
        await createPrimaryUserOnT1SharedWithT2(async () => {
            const resp = await Passwordless.signInUp({ tenantId: "t1", email });
            assert.strictEqual(resp.status, "OK");
            return resp.recipeUserId;
        });

        const t2SignUp = await Passwordless.signInUp({ tenantId: "t2", email });
        assert.strictEqual(t2SignUp.status, "OK");

        // createCode must find only the t2 user, as consumeCode does, instead of failing with
        // "multiple users exist matching the accountInfo"
        const codeRes = await request(app).post("/auth/t2/signinup/code").send({ email });
        assert.strictEqual(codeRes.status, 200);
        assert.strictEqual(codeRes.body.status, "OK");

        const code = await Passwordless.createCode({ tenantId: "t2", email });
        assert.strictEqual(code.status, "OK");
        const res = await request(app).post("/auth/t2/signinup/code/consume").send({
            preAuthSessionId: code.preAuthSessionId,
            deviceId: code.deviceId,
            userInputCode: code.userInputCode,
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.user.id, t2SignUp.user.id);
    });

    it("passwordless createCode with a session recognises the session user's login method from another tenant", async function () {
        // createCode on t2 must treat the session user's passwordless login method on t1 as theirs, as
        // consumeCode does, instead of trying to link a new user (automatic account linking is off).
        const app = await setup();
        const primaryUser = await createPrimaryUserOnT1SharedWithT2(async () => {
            const resp = await Passwordless.signInUp({ tenantId: "t1", email });
            assert.strictEqual(resp.status, "OK");
            return resp.recipeUserId;
        });
        const tpLoginMethod = (await STExpress.getUser(primaryUser.id)).loginMethods.find(
            (lm) => lm.recipeId === "thirdparty"
        );
        const session = await Session.createNewSessionWithoutRequestResponse("t2", tpLoginMethod.recipeUserId);

        const res = await request(app)
            .post("/auth/t2/signinup/code")
            .set("Authorization", `Bearer ${session.getAccessToken()}`)
            .send({ email, shouldTryLinkingWithSessionUser: true });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
    });
    it("passwordless createCode with a session uses the session user's next login method if the first one's phone number is taken", async function () {
        // The session user has a passwordless login method with email x and phone p on t1, and another one
        // with email x on t3. t2 has its own user with phone p, so the t1 login method cannot be added to t2.
        // consumeCode then adds the t3 login method to t2, so createCode must also treat this as a sign in.
        const app = await setup();
        await Multitenancy.createOrUpdateTenant("t3", { firstFactors: ["otp-email"] });
        const phoneNumber = "+14155552671";
        const primaryUser = await createPrimaryUserOnT1SharedWithT2(async () => {
            const resp = await Passwordless.signInUp({ tenantId: "t1", email });
            assert.strictEqual(resp.status, "OK");
            const updateResp = await Passwordless.updateUser({ recipeUserId: resp.recipeUserId, phoneNumber });
            assert.strictEqual(updateResp.status, "OK");
            return resp.recipeUserId;
        });
        const t3SignUp = await Passwordless.signInUp({ tenantId: "t3", email });
        assert.strictEqual(t3SignUp.status, "OK");
        const linkResp = await AccountLinking.linkAccounts(t3SignUp.recipeUserId, primaryUser.id);
        assert.strictEqual(linkResp.status, "OK");
        const t2PhoneUser = await Passwordless.signInUp({ tenantId: "t2", phoneNumber });
        assert.strictEqual(t2PhoneUser.status, "OK");

        const tpLoginMethod = (await STExpress.getUser(primaryUser.id)).loginMethods.find(
            (lm) => lm.recipeId === "thirdparty"
        );
        const session = await Session.createNewSessionWithoutRequestResponse("t2", tpLoginMethod.recipeUserId);

        const codeRes = await request(app)
            .post("/auth/t2/signinup/code")
            .set("Authorization", `Bearer ${session.getAccessToken()}`)
            .send({ email, shouldTryLinkingWithSessionUser: true });
        assert.strictEqual(codeRes.status, 200);
        assert.strictEqual(codeRes.body.status, "OK");

        const code = await Passwordless.createCode({ tenantId: "t2", email });
        assert.strictEqual(code.status, "OK");
        const res = await request(app)
            .post("/auth/t2/signinup/code/consume")
            .set("Authorization", `Bearer ${session.getAccessToken()}`)
            .send({
                preAuthSessionId: code.preAuthSessionId,
                deviceId: code.deviceId,
                userInputCode: code.userInputCode,
                shouldTryLinkingWithSessionUser: true,
            });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.user.id, primaryUser.id);

        const t3LoginMethod = (await STExpress.getUser(primaryUser.id)).loginMethods.find(
            (lm) => lm.recipeUserId.getAsString() === t3SignUp.recipeUserId.getAsString()
        );
        assert.deepStrictEqual(t3LoginMethod.tenantIds.sort(), ["t2", "t3"]);
    });

    // The core verifies a webauthn credential against the tenant of the sign in, so a credential that only
    // exists on another tenant is rejected before the authenticating user lookup runs, even with a session
    // from the primary user it is linked to.
    it("webauthn sign in with a session does not accept a credential of a linked login method from another tenant", async function () {
        const app = await setup();
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        let userHandle;
        let webauthnRecipeUserId;
        const primaryUser = await createPrimaryUserOnT1SharedWithT2(async () => {
            const registerOptions = await request(app).post("/auth/t1/webauthn/options/register").send({ email });
            assert.strictEqual(registerOptions.body.status, "OK");
            userHandle = registerOptions.body.user.id;
            const signUp = await request(app)
                .post("/auth/t1/webauthn/signup")
                .send({
                    credential: authenticator.createAttestation(registerOptions.body, { signCount: 0 }),
                    webauthnGeneratedOptionsId: registerOptions.body.webauthnGeneratedOptionsId,
                    shouldTryLinkingWithSessionUser: false,
                });
            assert.strictEqual(signUp.body.status, "OK");
            webauthnRecipeUserId = STExpress.convertToRecipeUserId(signUp.body.user.loginMethods[0].recipeUserId);
            return webauthnRecipeUserId;
        });

        // A session on t2 for the primary user, created through the third-party login method shared with t2.
        const tpLoginMethod = (await STExpress.getUser(primaryUser.id)).loginMethods.find(
            (lm) => lm.recipeId === "thirdparty"
        );
        const session = await Session.createNewSessionWithoutRequestResponse("t2", tpLoginMethod.recipeUserId);

        const signInOptions = await request(app).post("/auth/t2/webauthn/options/signin").send({});
        assert.strictEqual(signInOptions.body.status, "OK");

        const res = await request(app)
            .post("/auth/t2/webauthn/signin")
            .set("Authorization", `Bearer ${session.getAccessToken()}`)
            .send({
                credential: authenticator.createAssertion(signInOptions.body, { signCount: 0, userHandle }),
                webauthnGeneratedOptionsId: signInOptions.body.webauthnGeneratedOptionsId,
                shouldTryLinkingWithSessionUser: true,
            });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "INVALID_CREDENTIALS_ERROR");

        const webauthnLoginMethod = (await STExpress.getUser(primaryUser.id)).loginMethods.find(
            (lm) => lm.recipeUserId.getAsString() === webauthnRecipeUserId.getAsString()
        );
        assert.deepStrictEqual(webauthnLoginMethod.tenantIds, ["t1"]);
    });
});

describe(`getAuthenticatingUserAndAddToCurrentTenantIfRequired association conflicts: ${printPath(
    "[test/accountlinking/authenticatingUserTenant.test.js]"
)}`, function () {
    const { AuthUtils } = require("../../lib/build/authUtils");
    const { User } = require("../../lib/build/user");

    // Primary user P: its passwordless login method L (email x and phone p) is only on t1, and its
    // third-party login method (email x) is shared with t2, so the core lists P for (t2, email x).
    function makePrimaryUser() {
        return new User({
            id: "P",
            isPrimaryUser: true,
            tenantIds: ["t1", "t2"],
            emails: [email],
            phoneNumbers: ["+14155552671"],
            thirdParty: [{ id: "google", userId: "g1" }],
            webauthn: { credentialIds: [] },
            timeJoined: 1,
            loginMethods: [
                {
                    recipeId: "passwordless",
                    recipeUserId: "L",
                    tenantIds: ["t1"],
                    email,
                    phoneNumber: "+14155552671",
                    verified: true,
                    timeJoined: 1,
                },
                {
                    recipeId: "thirdparty",
                    recipeUserId: "TP",
                    tenantIds: ["t1", "t2"],
                    email,
                    thirdParty: { id: "google", userId: "g1" },
                    verified: true,
                    timeJoined: 1,
                },
            ],
        });
    }

    function makeStInstance(associateStatus, counters) {
        return {
            getRecipeInstanceOrThrow(name) {
                if (name === "accountlinking") {
                    return {
                        recipeInterfaceImpl: {
                            listUsersByAccountInfo: async () => {
                                counters.list++;
                                return [makePrimaryUser()];
                            },
                            getUser: async () => makePrimaryUser(),
                        },
                    };
                }
                if (name === "multitenancy") {
                    return {
                        recipeInterfaceImpl: {
                            associateUserToTenant: async () => {
                                counters.associate++;
                                return { status: associateStatus };
                            },
                        },
                    };
                }
                throw new Error("unexpected recipe " + name);
            },
        };
    }

    async function run(associateStatus) {
        const counters = { list: 0, associate: 0 };
        const result = await AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired({
            stInstance: makeStInstance(associateStatus, counters),
            recipeId: "passwordless",
            accountInfo: { email },
            tenantId: "t2",
            session: { getUserId: () => "P" },
            checkCredentialsOnTenant: async () => true,
            userContext: {},
        });
        return { result, counters };
    }

    it("handles the attempt as a sign up when the tenant has another user with the login method's phone number", async function () {
        const { result, counters } = await run("PHONE_NUMBER_ALREADY_EXISTS_ERROR");
        assert.strictEqual(result, undefined);
        assert.strictEqual(counters.list, 1);
        assert.strictEqual(counters.associate, 1);
    });

    it("retries once and then stops when listing again does not resolve an email conflict", async function () {
        const { result, counters } = await run("EMAIL_ALREADY_EXISTS_ERROR");
        assert.strictEqual(result, undefined);
        assert.strictEqual(counters.list, 2);
        assert.strictEqual(counters.associate, 2);
    });
});
