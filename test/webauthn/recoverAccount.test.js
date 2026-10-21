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
let { ProcessState } = require("../../lib/build/processState");
let WebAuthn = require("../../recipe/webauthn");
let EmailPassword = require("../../recipe/emailpassword");
let EmailVerification = require("../../recipe/emailverification");
let AccountLinking = require("../../recipe/accountlinking");
let ThirdParty = require("../../recipe/thirdparty");
let Session = require("../../recipe/session");
const request = require("supertest");
const express = require("express");
const { middleware, errorHandler } = require("../../framework/express");
const createSoftAuthenticator = require("./lib/softAuthenticator");

const RP_ID = "supertokens.io";
const ORIGIN = "https://supertokens.io";

let recoverAccountTokens;

async function initSTAndGetApp({ accountLinking = true } = {}) {
    recoverAccountTokens = {};
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
    STExpress.init({
        supertokens: { connectionURI },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [{ config: { thirdPartyId: "google", clients: [{ clientId: "client" }] } }],
                },
            }),
            EmailVerification.init({
                mode: "REQUIRED",
                emailDelivery: { override: (oI) => ({ ...oI, sendEmail: async () => {} }) },
            }),
            WebAuthn.init({
                getRelyingPartyId: async () => RP_ID,
                getOrigin: async () => ORIGIN,
                emailDelivery: {
                    override: (oI) => ({
                        ...oI,
                        sendEmail: async (input) => {
                            recoverAccountTokens[input.user.email] = new URL(input.recoverAccountLink).searchParams.get(
                                "token"
                            );
                        },
                    }),
                },
            }),
            Session.init({ getTokenTransferMethod: () => "header" }),
            ...(accountLinking
                ? [
                      AccountLinking.init({
                          shouldDoAutomaticAccountLinking: async (
                              _newAccountInfo,
                              _user,
                              _session,
                              _tenantId,
                              userContext
                          ) =>
                              userContext.doNotLink === true
                                  ? { shouldAutomaticallyLink: false }
                                  : { shouldAutomaticallyLink: true, shouldRequireVerification: true },
                      }),
                  ]
                : []),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
}

async function post(app, path, body) {
    const res = await request(app).post(path).send(body);
    assert.strictEqual(res.status, 200, `${path} returned ${res.status}: ${res.text}`);
    return { body: res.body, headers: res.headers };
}

function newAuthenticator() {
    return createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
}

async function verifyEmail(recipeUserId, email) {
    const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
    assert.strictEqual(tokenRes.status, "OK");
    const verifyRes = await EmailVerification.verifyEmailUsingToken("public", tokenRes.token, false);
    assert.strictEqual(verifyRes.status, "OK");
}

async function createVerifiedPrimaryEmailPasswordUser(email) {
    const signUpRes = await EmailPassword.signUp("public", email, "password123");
    assert.strictEqual(signUpRes.status, "OK");
    const recipeUserId = signUpRes.user.loginMethods[0].recipeUserId;
    await verifyEmail(recipeUserId, email);
    if (!(await STExpress.getUser(recipeUserId.getAsString())).isPrimaryUser) {
        const primaryRes = await AccountLinking.createPrimaryUser(recipeUserId);
        assert.strictEqual(primaryRes.status, "OK");
    }
    return recipeUserId;
}

async function webauthnSignUp(app, authenticator, email) {
    const registerOptions = (await post(app, "/auth/webauthn/options/register", { email })).body;
    assert.strictEqual(registerOptions.status, "OK");
    const signUpRes = await post(app, "/auth/webauthn/signup", {
        credential: authenticator.createAttestation(registerOptions),
        webauthnGeneratedOptionsId: registerOptions.webauthnGeneratedOptionsId,
        shouldTryLinkingWithSessionUser: false,
    });
    assert.strictEqual(signUpRes.body.status, "OK", JSON.stringify(signUpRes.body));
    return {
        user: signUpRes.body.user,
        userHandle: registerOptions.user.id,
        accessToken: signUpRes.headers["st-access-token"],
    };
}

async function webauthnSignIn(app, authenticator, userHandle) {
    const signInOptions = (await post(app, "/auth/webauthn/options/signin", {})).body;
    assert.strictEqual(signInOptions.status, "OK");
    return (
        await post(app, "/auth/webauthn/signin", {
            credential: authenticator.createAssertion(signInOptions, { signCount: 0, userHandle }),
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            shouldTryLinkingWithSessionUser: false,
        })
    ).body;
}

async function requestRecoverAccountToken(app, email) {
    const res = await post(app, "/auth/user/webauthn/reset/token", { email });
    assert.strictEqual(res.body.status, "OK");
    assert.notStrictEqual(recoverAccountTokens[email], undefined, `no recover account email sent to ${email}`);
    return recoverAccountTokens[email];
}

async function recoverAccount(app, { token, registerOptions, authenticator }) {
    return (
        await post(app, "/auth/user/webauthn/reset", {
            token,
            webauthnGeneratedOptionsId: registerOptions.webauthnGeneratedOptionsId,
            credential: authenticator.createAttestation(registerOptions),
        })
    ).body;
}

async function getRegisterOptionsForToken(app, token) {
    const registerOptions = (await post(app, "/auth/webauthn/options/register", { recoverAccountToken: token })).body;
    assert.strictEqual(registerOptions.status, "OK");
    return registerOptions;
}

async function getWebauthnUsersForEmail(email) {
    const users = await STExpress.listUsersByAccountInfo("public", { email });
    return users.filter((u) => u.loginMethods.some((lm) => lm.recipeId === "webauthn" && lm.hasSameEmailAs(email)));
}

async function getCredentialIds(recipeUserId) {
    const res = await WebAuthn.listCredentials({ recipeUserId });
    assert.strictEqual(res.status, "OK");
    return res.credentials.map((c) => c.webauthnCredentialId).sort();
}

describe(`webauthn recoverAccountPOST: ${printPath("[test/webauthn/recoverAccount.test.js]")}`, function () {
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

    describe("generated options for a different email", function () {
        it("does not create a webauthn user for another email when recovering a primary user", async function () {
            const app = await initSTAndGetApp();
            await createVerifiedPrimaryEmailPasswordUser("owner@example.com");
            await createVerifiedPrimaryEmailPasswordUser("other@example.com");

            const token = await requestRecoverAccountToken(app, "owner@example.com");
            const registerOptions = (await post(app, "/auth/webauthn/options/register", { email: "other@example.com" }))
                .body;
            assert.strictEqual(registerOptions.status, "OK");

            const res = await recoverAccount(app, { token, registerOptions, authenticator: newAuthenticator() });

            assert.strictEqual(res.status, "INVALID_OPTIONS_ERROR");
            assert.strictEqual((await getWebauthnUsersForEmail("other@example.com")).length, 0);
            assert.strictEqual((await getWebauthnUsersForEmail("owner@example.com")).length, 0);
        });

        it("does not register a credential from options for another email on an existing webauthn user", async function () {
            const app = await initSTAndGetApp();
            const { user } = await webauthnSignUp(app, newAuthenticator(), "owner@example.com");
            const recipeUserId = user.loginMethods[0].recipeUserId;
            const credentialsBefore = await getCredentialIds(recipeUserId);

            const token = await requestRecoverAccountToken(app, "owner@example.com");
            const registerOptions = (await post(app, "/auth/webauthn/options/register", { email: "other@example.com" }))
                .body;

            const res = await recoverAccount(app, { token, registerOptions, authenticator: newAuthenticator() });

            assert.strictEqual(res.status, "INVALID_OPTIONS_ERROR");
            assert.deepStrictEqual(await getCredentialIds(recipeUserId), credentialsBefore);
        });

        it("compares the emails case-insensitively", async function () {
            const app = await initSTAndGetApp();
            await webauthnSignUp(app, newAuthenticator(), "owner@example.com");

            const token = await requestRecoverAccountToken(app, "owner@example.com");
            const registerOptions = (await post(app, "/auth/webauthn/options/register", { email: "Owner@Example.com" }))
                .body;

            const res = await recoverAccount(app, { token, registerOptions, authenticator: newAuthenticator() });

            assert.strictEqual(res.status, "OK");
        });
    });

    describe("recovering a primary user without a webauthn login method", function () {
        // The primary user's root login method has personal@example.com, and a linked login method has work@example.com
        async function createPrimaryUserWithLinkedEmail() {
            const primaryRecipeUserId = await createVerifiedPrimaryEmailPasswordUser("personal@example.com");
            const linkedResp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "google-user",
                "work@example.com",
                true,
                undefined,
                { doNotLink: true }
            );
            assert.strictEqual(linkedResp.status, "OK");
            const linkResp = await AccountLinking.linkAccounts(
                linkedResp.recipeUserId,
                primaryRecipeUserId.getAsString()
            );
            assert.strictEqual(linkResp.status, "OK");
            return primaryRecipeUserId.getAsString();
        }

        it("does not send a recovery email for an email that is not the root login method's email", async function () {
            const app = await initSTAndGetApp();
            await createPrimaryUserWithLinkedEmail();

            const res = await post(app, "/auth/user/webauthn/reset/token", { email: "work@example.com" });

            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(recoverAccountTokens["work@example.com"], undefined);
        });

        it("recovers through the root login method's email", async function () {
            const app = await initSTAndGetApp();
            const primaryUserId = await createPrimaryUserWithLinkedEmail();

            const token = await requestRecoverAccountToken(app, "personal@example.com");
            const registerOptions = await getRegisterOptionsForToken(app, token);
            const authenticator = newAuthenticator();
            const res = await recoverAccount(app, { token, registerOptions, authenticator });

            assert.strictEqual(res.status, "OK");
            const primaryUser = await STExpress.getUser(primaryUserId);
            const webauthnLoginMethods = primaryUser.loginMethods.filter((lm) => lm.recipeId === "webauthn");
            assert.strictEqual(webauthnLoginMethods.length, 1);
            assert.strictEqual(webauthnLoginMethods[0].email, "personal@example.com");
            assert.strictEqual(webauthnLoginMethods[0].verified, true);
            const signInRes = await webauthnSignIn(app, authenticator, registerOptions.user.id);
            assert.strictEqual(signInRes.status, "OK");
            assert.strictEqual(signInRes.user.id, primaryUserId);
        });
    });

    describe("creating a new webauthn user", function () {
        it("does not create the user if sign up is not allowed for the email", async function () {
            const app = await initSTAndGetApp();
            const recipeUserId = await createVerifiedPrimaryEmailPasswordUser("owner@example.com");
            const token = await requestRecoverAccountToken(app, "owner@example.com");
            const registerOptions = await getRegisterOptionsForToken(app, token);

            // the primary user's email is no longer verified when the token is used
            await EmailVerification.unverifyEmail(recipeUserId, "owner@example.com");

            const res = await recoverAccount(app, { token, registerOptions, authenticator: newAuthenticator() });

            assert.strictEqual(res.status, "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR");
            assert.strictEqual((await getWebauthnUsersForEmail("owner@example.com")).length, 0);
        });

        it("creates and links the user if sign up is allowed for the email", async function () {
            const app = await initSTAndGetApp();
            const recipeUserId = await createVerifiedPrimaryEmailPasswordUser("owner@example.com");
            const token = await requestRecoverAccountToken(app, "owner@example.com");
            const registerOptions = await getRegisterOptionsForToken(app, token);

            const res = await recoverAccount(app, { token, registerOptions, authenticator: newAuthenticator() });

            assert.strictEqual(res.status, "OK");
            const primaryUser = await STExpress.getUser(recipeUserId.getAsString());
            assert.strictEqual(primaryUser.loginMethods.length, 2);
            assert(primaryUser.loginMethods.some((lm) => lm.recipeId === "webauthn" && lm.verified));
        });
    });

    for (const accountLinking of [true, false]) {
        describe(`recovering an unverified webauthn user (account linking ${
            accountLinking ? "on" : "off"
        })`, function () {
            it("removes credentials and sessions that existed before the email was verified", async function () {
                const app = await initSTAndGetApp({ accountLinking });
                const earlierAuthenticator = newAuthenticator();
                const earlier = await webauthnSignUp(app, earlierAuthenticator, "owner@example.com");
                const recipeUserId = earlier.user.loginMethods[0].recipeUserId;
                const earlierSession = await Session.getSessionWithoutRequestResponse(earlier.accessToken, undefined, {
                    overrideGlobalClaimValidators: () => [],
                });

                const token = await requestRecoverAccountToken(app, "owner@example.com");
                const registerOptions = await getRegisterOptionsForToken(app, token);
                const recoveringAuthenticator = newAuthenticator();
                const res = await recoverAccount(app, {
                    token,
                    registerOptions,
                    authenticator: recoveringAuthenticator,
                });
                assert.strictEqual(res.status, "OK");

                const user = await STExpress.getUser(recipeUserId);
                const lm = user.loginMethods.find((lm) => lm.recipeUserId.getAsString() === recipeUserId);
                assert.strictEqual(lm.verified, true);

                assert.deepStrictEqual(await getCredentialIds(recipeUserId), [
                    recoveringAuthenticator.credentialId.toString("base64url"),
                ]);
                assert.strictEqual(
                    await Session.getSessionInformation(earlierSession.getHandle()),
                    undefined,
                    "the session created before the recovery should be revoked"
                );

                const earlierSignIn = await webauthnSignIn(app, earlierAuthenticator, earlier.userHandle);
                assert.notStrictEqual(earlierSignIn.status, "OK");

                const recoveredSignIn = await webauthnSignIn(app, recoveringAuthenticator, registerOptions.user.id);
                assert.strictEqual(recoveredSignIn.status, "OK");
            });

            if (accountLinking) {
                it("does not accept an access token from before the recovery to link a new login method", async function () {
                    const app = await initSTAndGetApp({ accountLinking });
                    const earlier = await webauthnSignUp(app, newAuthenticator(), "owner@example.com");

                    const token = await requestRecoverAccountToken(app, "owner@example.com");
                    const registerOptions = await getRegisterOptionsForToken(app, token);
                    const res = await recoverAccount(app, {
                        token,
                        registerOptions,
                        authenticator: newAuthenticator(),
                    });
                    assert.strictEqual(res.status, "OK");

                    const linkRes = await request(app)
                        .post("/auth/signup")
                        .set("Authorization", `Bearer ${earlier.accessToken}`)
                        .send({
                            formFields: [
                                { id: "email", value: "someone-else@example.com" },
                                { id: "password", value: "password123" },
                            ],
                            shouldTryLinkingWithSessionUser: true,
                        });

                    assert.strictEqual(linkRes.status, 401);
                    assert.strictEqual(
                        (await STExpress.listUsersByAccountInfo("public", { email: "someone-else@example.com" }))
                            .length,
                        0
                    );
                });
            }
        });
    }

    describe("recovering a verified webauthn user", function () {
        it("keeps its other credentials and sessions", async function () {
            const app = await initSTAndGetApp();
            const firstAuthenticator = newAuthenticator();
            const first = await webauthnSignUp(app, firstAuthenticator, "owner@example.com");
            const recipeUserId = first.user.loginMethods[0].recipeUserId;
            await verifyEmail(STExpress.convertToRecipeUserId(recipeUserId), "owner@example.com");
            const firstSession = await Session.getSessionWithoutRequestResponse(first.accessToken, undefined, {
                overrideGlobalClaimValidators: () => [],
            });

            const token = await requestRecoverAccountToken(app, "owner@example.com");
            const registerOptions = await getRegisterOptionsForToken(app, token);
            const secondAuthenticator = newAuthenticator();
            const res = await recoverAccount(app, { token, registerOptions, authenticator: secondAuthenticator });
            assert.strictEqual(res.status, "OK");

            assert.deepStrictEqual(
                await getCredentialIds(recipeUserId),
                [
                    firstAuthenticator.credentialId.toString("base64url"),
                    secondAuthenticator.credentialId.toString("base64url"),
                ].sort()
            );
            assert.notStrictEqual(await Session.getSessionInformation(firstSession.getHandle()), undefined);
            assert.strictEqual((await webauthnSignIn(app, firstAuthenticator, first.userHandle)).status, "OK");
        });
    });
});
