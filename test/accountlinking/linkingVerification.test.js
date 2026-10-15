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
const { printPath, startSTWithMultitenancyAndAccountLinking, killAllST, setupST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let sinon = require("sinon");
let { ProcessState } = require("../../lib/build/processState");
let { User } = require("../../lib/build/user");
let AccountLinkingRecipe = require("../../lib/build/recipe/accountlinking/recipe").default;
let AccountLinking = require("../../recipe/accountlinking");
let EmailPassword = require("../../recipe/emailpassword");
let EmailVerification = require("../../recipe/emailverification");
let ThirdParty = require("../../recipe/thirdparty");
let Session = require("../../recipe/session");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const email = "x@example.com";

async function setup({ shouldRequireVerification }) {
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
                shouldDoAutomaticAccountLinking: async (_newAccountInfo, user, _session, _tenantId, userContext) => {
                    if (userContext.doNotLink === true) {
                        return { shouldAutomaticallyLink: false };
                    }
                    return {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification:
                            typeof shouldRequireVerification === "function"
                                ? shouldRequireVerification(user)
                                : shouldRequireVerification,
                    };
                },
            }),
            EmailPassword.init({
                emailDelivery: {
                    override: (original) => ({
                        ...original,
                        sendEmail: async () => {},
                    }),
                },
            }),
            EmailVerification.init({
                mode: "OPTIONAL",
                emailDelivery: {
                    override: (original) => ({
                        ...original,
                        sendEmail: async () => {},
                    }),
                },
            }),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        { config: { thirdPartyId: "google", clients: [{ clientId: "", clientSecret: "" }] } },
                        { config: { thirdPartyId: "github", clients: [{ clientId: "", clientSecret: "" }] } },
                    ],
                },
            }),
            Session.init(),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
}

async function createPrimaryThirdPartyUser({ isVerified }) {
    const createResp = await ThirdParty.manuallyCreateOrUpdateUser(
        "public",
        "google",
        "primary-user",
        email,
        isVerified,
        undefined,
        { doNotLink: true }
    );
    assert.strictEqual(createResp.status, "OK");
    const primaryResp = await AccountLinking.createPrimaryUser(createResp.recipeUserId);
    assert.strictEqual(primaryResp.status, "OK");
    const lm = primaryResp.user.loginMethods[0];
    assert.strictEqual(lm.email, email);
    assert.strictEqual(lm.verified, isVerified);
    return primaryResp.user;
}

function isLinkedTo(user, primaryUser) {
    return user.id === primaryUser.id && user.loginMethods.length > 1;
}

function makeUser({ id, isPrimaryUser, loginMethods }) {
    return new User({
        id,
        isPrimaryUser,
        tenantIds: ["public"],
        emails: loginMethods.filter((lm) => lm.email !== undefined).map((lm) => lm.email),
        phoneNumbers: loginMethods.filter((lm) => lm.phoneNumber !== undefined).map((lm) => lm.phoneNumber),
        thirdParty: loginMethods.filter((lm) => lm.thirdParty !== undefined).map((lm) => lm.thirdParty),
        webauthn: { credentialIds: [] },
        timeJoined: 0,
        loginMethods: loginMethods.map((lm) => ({
            tenantIds: ["public"],
            timeJoined: 0,
            webauthn: undefined,
            ...lm,
        })),
    });
}

describe(`automatic account linking verification checks: ${printPath(
    "[test/accountlinking/linkingVerification.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    beforeEach(function () {
        ProcessState.getInstance().reset();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe("with recipe users in the core", function () {
        it("does not link a verified third party user to a primary user that has the email unverified, if verification is required", async function () {
            await setup({ shouldRequireVerification: true });
            const primaryUser = await createPrimaryThirdPartyUser({ isVerified: false });

            const resp = await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "incoming", email, true);
            assert.strictEqual(resp.status, "OK");
            const incomingLoginMethod = resp.user.loginMethods.find(
                (lm) => lm.recipeUserId.getAsString() === resp.recipeUserId.getAsString()
            );
            assert.strictEqual(incomingLoginMethod.verified, true);
            assert(!isLinkedTo(resp.user, primaryUser));

            const primaryUserAfter = await STExpress.getUser(primaryUser.id);
            assert.strictEqual(primaryUserAfter.loginMethods.length, 1);
        });

        it("does not link a user after password reset to a primary user that has the email unverified, if verification is required", async function () {
            const app = await setup({ shouldRequireVerification: true });
            const primaryUser = await createPrimaryThirdPartyUser({ isVerified: false });

            const signUpResp = await EmailPassword.signUp("public", email, "password1234", undefined, {
                doNotLink: true,
            });
            assert.strictEqual(signUpResp.status, "OK");
            assert.strictEqual(signUpResp.user.isPrimaryUser, false);
            assert.strictEqual(signUpResp.user.loginMethods[0].verified, false);
            const recipeUser = signUpResp.user;

            const tokenResp = await EmailPassword.createResetPasswordToken("public", recipeUser.id, email);
            assert.strictEqual(tokenResp.status, "OK");

            const resetResp = await request(app)
                .post("/auth/user/password/reset")
                .send({
                    token: tokenResp.token,
                    formFields: [{ id: "password", value: "newPassword1234" }],
                });
            assert.strictEqual(resetResp.status, 200);
            assert.strictEqual(resetResp.body.status, "OK");

            const recipeUserAfter = await STExpress.getUser(recipeUser.id);
            assert.strictEqual(recipeUserAfter.id, recipeUser.id);
            assert.strictEqual(recipeUserAfter.loginMethods.length, 1);
            assert.strictEqual(recipeUserAfter.loginMethods[0].verified, true);

            const primaryUserAfter = await STExpress.getUser(primaryUser.id);
            assert.strictEqual(primaryUserAfter.loginMethods.length, 1);
        });

        it("links a verified third party user to a primary user that has the email verified, if verification is required", async function () {
            await setup({ shouldRequireVerification: true });
            const primaryUser = await createPrimaryThirdPartyUser({ isVerified: true });

            const resp = await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "incoming", email, true);
            assert.strictEqual(resp.status, "OK");
            assert(isLinkedTo(resp.user, primaryUser));
        });

        it("links a third party user to a primary user that has the email unverified, if verification is not required", async function () {
            await setup({ shouldRequireVerification: false });
            const primaryUser = await createPrimaryThirdPartyUser({ isVerified: false });

            const resp = await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "incoming", email, false);
            assert.strictEqual(resp.status, "OK");
            assert(isLinkedTo(resp.user, primaryUser));
        });
    });

    describe("with an older non-primary user and no primary user", function () {
        // Verification is not required when deciding if the older user can become primary (user is undefined),
        // but it is required when linking to it
        const requireVerificationOnlyForLinking = (user) => user !== undefined;

        async function createOlderUser({ isVerified }) {
            const resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "older-user",
                email,
                isVerified,
                undefined,
                { doNotLink: true }
            );
            assert.strictEqual(resp.status, "OK");
            assert.strictEqual(resp.user.isPrimaryUser, false);
            assert.strictEqual(resp.user.loginMethods[0].verified, isVerified);
            return resp.user;
        }

        it("does not link a verified user to the older user if its matching email is unverified and verification is required", async function () {
            await setup({ shouldRequireVerification: requireVerificationOnlyForLinking });
            const olderUser = await createOlderUser({ isVerified: false });

            const resp = await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "incoming", email, true);
            assert.strictEqual(resp.status, "OK");
            assert.notStrictEqual(resp.user.id, olderUser.id);
            assert.strictEqual(resp.user.loginMethods.length, 1);

            const olderUserAfter = await STExpress.getUser(olderUser.id);
            assert.strictEqual(olderUserAfter.loginMethods.length, 1);
        });

        it("links a verified user to the older user if its matching email is verified and verification is required", async function () {
            await setup({ shouldRequireVerification: requireVerificationOnlyForLinking });
            const olderUser = await createOlderUser({ isVerified: true });

            const resp = await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "incoming", email, true);
            assert.strictEqual(resp.status, "OK");
            assert.strictEqual(resp.user.id, olderUser.id);
            assert.strictEqual(resp.user.loginMethods.length, 2);
        });

        it("links to the older user if its matching email is unverified and verification is not required", async function () {
            await setup({ shouldRequireVerification: false });
            const olderUser = await createOlderUser({ isVerified: false });

            const resp = await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "incoming", email, false);
            assert.strictEqual(resp.status, "OK");
            assert.strictEqual(resp.user.id, olderUser.id);
            assert.strictEqual(resp.user.loginMethods.length, 2);
        });
    });

    describe("tryLinkingByAccountInfoOrCreatePrimaryUser", function () {
        async function tryLinking({ shouldRequireVerification, inputLoginMethod, primaryLoginMethod }) {
            await setup({ shouldRequireVerification });
            const recipe = AccountLinkingRecipe.getInstance();

            const inputUser = makeUser({
                id: "input-user",
                isPrimaryUser: false,
                loginMethods: [{ recipeUserId: "input-user", ...inputLoginMethod }],
            });
            const primaryUser = makeUser({
                id: "primary-user",
                isPrimaryUser: true,
                loginMethods: [{ recipeUserId: "primary-user", ...primaryLoginMethod }],
            });

            sinon.stub(recipe, "getPrimaryUserThatCanBeLinkedToRecipeUserId").resolves(primaryUser);
            const linkAccounts = sinon
                .stub(recipe.recipeInterfaceImpl, "linkAccounts")
                .resolves({ status: "OK", accountsAlreadyLinked: false, user: primaryUser });

            const result = await recipe.tryLinkingByAccountInfoOrCreatePrimaryUser({
                inputUser,
                session: undefined,
                tenantId: "public",
                userContext: {},
            });
            return { result, linkAccounts };
        }

        it("returns NO_LINK if the primary user's matching email is unverified and verification is required", async function () {
            const { result, linkAccounts } = await tryLinking({
                shouldRequireVerification: true,
                inputLoginMethod: {
                    recipeId: "thirdparty",
                    email,
                    thirdParty: { id: "github", userId: "incoming" },
                    verified: true,
                },
                primaryLoginMethod: {
                    recipeId: "thirdparty",
                    email,
                    thirdParty: { id: "google", userId: "primary" },
                    verified: false,
                },
            });
            assert.strictEqual(result.status, "NO_LINK");
            assert(linkAccounts.notCalled);
        });

        it("links if the primary user's matching email is verified and verification is required", async function () {
            const { result, linkAccounts } = await tryLinking({
                shouldRequireVerification: true,
                inputLoginMethod: {
                    recipeId: "thirdparty",
                    email,
                    thirdParty: { id: "github", userId: "incoming" },
                    verified: true,
                },
                primaryLoginMethod: {
                    recipeId: "thirdparty",
                    email,
                    thirdParty: { id: "google", userId: "primary" },
                    verified: true,
                },
            });
            assert.strictEqual(result.status, "OK");
            assert(linkAccounts.calledOnce);
        });

        it("links if the primary user's matching email is unverified and verification is not required", async function () {
            const { result, linkAccounts } = await tryLinking({
                shouldRequireVerification: false,
                inputLoginMethod: {
                    recipeId: "thirdparty",
                    email,
                    thirdParty: { id: "github", userId: "incoming" },
                    verified: false,
                },
                primaryLoginMethod: {
                    recipeId: "thirdparty",
                    email,
                    thirdParty: { id: "google", userId: "primary" },
                    verified: false,
                },
            });
            assert.strictEqual(result.status, "OK");
            assert(linkAccounts.calledOnce);
        });

        it("returns NO_LINK if the primary user's matching phone number is unverified and verification is required", async function () {
            const { result, linkAccounts } = await tryLinking({
                shouldRequireVerification: true,
                inputLoginMethod: { recipeId: "passwordless", phoneNumber: "+14155552671", verified: true },
                primaryLoginMethod: { recipeId: "passwordless", phoneNumber: "+14155552671", verified: false },
            });
            assert.strictEqual(result.status, "NO_LINK");
            assert(linkAccounts.notCalled);
        });

        it("links if the primary user's matching phone number is verified and verification is required", async function () {
            const { result, linkAccounts } = await tryLinking({
                shouldRequireVerification: true,
                inputLoginMethod: { recipeId: "passwordless", phoneNumber: "+14155552671", verified: true },
                primaryLoginMethod: { recipeId: "passwordless", phoneNumber: "+14155552671", verified: true },
            });
            assert.strictEqual(result.status, "OK");
            assert(linkAccounts.calledOnce);
        });

        it("links if the primary user's matching phone number is unverified and verification is not required", async function () {
            const { result, linkAccounts } = await tryLinking({
                shouldRequireVerification: false,
                inputLoginMethod: { recipeId: "passwordless", phoneNumber: "+14155552671", verified: false },
                primaryLoginMethod: { recipeId: "passwordless", phoneNumber: "+14155552671", verified: false },
            });
            assert.strictEqual(result.status, "OK");
            assert(linkAccounts.calledOnce);
        });
    });
});
