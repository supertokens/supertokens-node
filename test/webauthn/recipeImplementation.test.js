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
const { printPath, setupST, killAllST, cleanST, isCDIVersionCompatible } = require("../utils");
const assert = require("assert");
const request = require("supertest");
const express = require("express");
const { ProcessState } = require("../../lib/build/processState");
const { middleware, errorHandler } = require("../../framework/express");
// @ts-ignore
const { initST, origin, rpId, rpName } = require("./lib/initST");
const getWebauthnLib = require("./lib/getWebAuthnLib");
const getWebAuthnRecipe = require("./lib/getWebAuthnRecipe");
const createUser = require("./lib/createUser");
const createRegisterOptions = require("./lib/createRegisterOptions");
const createSignInOptions = require("./lib/createSignInOptions");

const userContext = {};

describe(`recipeImplementationFunctions: ${printPath("[test/webauthn/recipeImplementation.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("[registerOptions]", function () {
        it("correctly creates the options with email", async function () {
            await initST();

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin,
                email: "test@example.com",
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "OK");
            assert.equal(typeof generatedOptions.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof generatedOptions.createdAt, "number");
            assert.equal(typeof generatedOptions.expiresAt, "number");
            assert.equal(typeof generatedOptions.timeout, "number");
            assert.equal(generatedOptions.createdAt + generatedOptions.timeout, generatedOptions.expiresAt);
            assert.equal(generatedOptions.rp.id, rpId);
            assert.equal(generatedOptions.rp.name, rpName);
            assert.equal(generatedOptions.user.name, "test@example.com");
            assert.equal(generatedOptions.user.displayName, "test@example.com");
        });

        it("correctly creates the options with recover account token", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext,
                }
            );

            assert.equal(generateRecoverAccountTokenResponse.status, "OK");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin,
                recoverAccountToken: generateRecoverAccountTokenResponse.token,
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "OK");
            assert.equal(typeof generatedOptions.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof generatedOptions.challenge, "string");
            assert.equal(typeof generatedOptions.createdAt, "number");
            assert.equal(typeof generatedOptions.expiresAt, "number");
            assert.equal(typeof generatedOptions.timeout, "number");
            assert.equal(generatedOptions.createdAt + generatedOptions.timeout, generatedOptions.expiresAt);
            assert.equal(generatedOptions.rp.id, rpId);
            assert.equal(generatedOptions.rp.name, rpName);
            assert.equal(generatedOptions.user.name, email);
            assert.equal(generatedOptions.user.displayName, email);
        });

        it("should throw an error if the recover account token is invalid", async function () {
            await initST();

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin,
                recoverAccountToken: "invalid",
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR");
        });

        it("should throw an error if the email is invalid", async function () {
            await initST();

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin,
                email: "invalid",
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "INVALID_EMAIL_ERROR");
        });

        it("should return the correct error if the passed options are invalid", async function () {
            await initST();

            const email = "test@example.com";
            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                attestation: "invalid",
                origin,
                email,
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "INVALID_OPTIONS_ERROR");
        });

        it("should return the correct error if the options origin does not match the relying party id", async function () {
            await initST();

            const email = "test@example.com";

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin: "https://test.com",
                email,
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "INVALID_OPTIONS_ERROR");
        });
    });

    describe("[signInOptions]", function () {
        it("correctly creates the options", async function () {
            await initST();

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.signInOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin,
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "OK");
            assert.equal(typeof generatedOptions.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof generatedOptions.challenge, "string");
            assert.equal(typeof generatedOptions.createdAt, "number");
            assert.equal(typeof generatedOptions.expiresAt, "number");
            assert.equal(typeof generatedOptions.timeout, "number");
            assert.equal(generatedOptions.createdAt + generatedOptions.timeout, generatedOptions.expiresAt);
        });

        it("should return the correct error if the passed options are invalid", async function () {
            await initST();

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.signInOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                userVerification: "invalid",
                origin,
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "INVALID_OPTIONS_ERROR");
        });

        it("should return the correct error if the options origin does not match the relying party id", async function () {
            await initST();

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.signInOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin: "https://test.com",
                tenantId: "public",
                userContext,
            });

            assert.equal(generatedOptions.status, "INVALID_OPTIONS_ERROR");
        });
    });

    describe("[signUp]", function () {
        it("correctly creates a new user", async function () {
            await initST();

            const email = "test@example.com";
            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential,
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse.status, "OK");
            assert.equal(typeof signUpResponse.user.id, "string");
            assert.equal(
                signUpResponse.user.emails.find((e) => e === email),
                email
            );
        });

        it("should return the correct error if the email already exists", async function () {
            await initST();

            const { email, signUpResponse: existingUser } = await createUser(rpId, rpName, origin);

            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential,
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse.status, "EMAIL_ALREADY_EXISTS_ERROR");
        });

        it("when credential clientDataJSON is null, should return the correct error if the credential is invalid", async function () {
            await initST();

            const email = "test@example.com";
            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId: rpId,
                rpName: rpName,
                origin: origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse1 = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential: {
                    ...credential,
                    response: { ...credential.response, clientDataJSON: null },
                },
                tenantId: "public",
                userContext,
            });
            assert.equal(signUpResponse1.status, "INVALID_CREDENTIALS_ERROR");
        });

        it("when credential type is integer, should return the correct error if the credential is invalid", async function () {
            await initST();

            const email = "test@example.com";
            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId: rpId,
                rpName: rpName,
                origin: origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse2 = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential: {
                    type: 1,
                    ...credential,
                },
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse2.status, "INVALID_CREDENTIALS_ERROR");
        });

        it("should return the correct error if the options do not exist", async function () {
            await initST();

            const email = "test@example.com";
            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: "invalid",
                credential,
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse.status, "OPTIONS_NOT_FOUND_ERROR");
        });

        it("should return the correct error if the origin of the credential does not match the origin of the options", async function () {
            await initST();

            const email = "test@example.com";
            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin: "https://test.com",
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential,
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse.status, "INVALID_OPTIONS_ERROR");
        });

        it("should return the correct error if the origin of the credential is not part of the relying party id", async function () {
            await initST();

            const email = "test@example.com";
            const registerOptionsResponse = await getWebAuthnRecipe().recipeInterfaceImpl.registerOptions({
                relyingPartyId: rpId,
                relyingPartyName: rpName,
                origin: "https://test.com",
                email,
                tenantId: "public",
                userContext,
            });

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin: "https://test.com",
                userNotPresent: false,
                userNotVerified: false,
            });

            const signUpResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential,
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse.status, "INVALID_AUTHENTICATOR_ERROR");
        });

        it("should return the correct error if the options timeout is exceeded", async function () {
            await initST({ registerTimeout: 50 });

            const email = "test@example.com";
            const registerOptionsResponse = await createRegisterOptions(email);
            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            await new Promise((resolve) => setTimeout(() => resolve(), 200));

            const signUpResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signUp({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential,
                tenantId: "public",
                userContext,
            });

            assert.equal(signUpResponse.status, "INVALID_OPTIONS_ERROR");
        });
    });

    describe("[signIn]", function () {
        it("correctly signs in a user", async function () {
            await initST();

            const { signUpResponse, signInOptionsResponse, credential } = await createUser(rpId, rpName, origin);

            const signInResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signIn({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                credential: credential.assertion,
                tenantId: "public",
                userContext,
            });

            assert.equal(signInResponse.status, "OK");
            assert.equal(signInResponse.user.id, signUpResponse.user.id);
        });

        it("should return the correct error if the credential is not found", async function () {
            await initST();

            const { createAndAssertCredential } = await getWebauthnLib();
            const registerOptionsResponse = await createRegisterOptions("test@example.com");
            const signInOptionsResponse = await createSignInOptions();
            const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const signInResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signIn({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                credential: credential.assertion,
                tenantId: "public",
                userContext,
            });

            assert.equal(signInResponse.status, "CREDENTIAL_NOT_FOUND_ERROR");
        });

        it("should return the correct error if the options are not found", async function () {
            await initST();

            const { credential } = await createUser(rpId, rpName, origin);

            const signInResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signIn({
                webauthnGeneratedOptionsId: "invalid",
                credential: credential.assertion,
                tenantId: "public",
                userContext,
            });

            assert.equal(signInResponse.status, "OPTIONS_NOT_FOUND_ERROR");
        });

        it("should return the correct error if the options timeout is exceeded", async function () {
            await initST({ signInTimeout: 50 });

            const { signInOptionsResponse, credential } = await createUser(rpId, rpName, origin);

            await new Promise((resolve) => setTimeout(() => resolve(), 200));

            const signInResponse = await getWebAuthnRecipe().recipeInterfaceImpl.signIn({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                credential: credential.assertion,
                tenantId: "public",
                userContext,
            });

            assert.equal(signInResponse.status, "INVALID_OPTIONS_ERROR");
        });

        it("when credential clientDataJSON is null, should return the correct error if the credential is invalid", async function () {
            await initST();

            const { signUpResponse, signInOptionsResponse, credential } = await createUser(rpId, rpName, origin);

            const signInResponse1 = await getWebAuthnRecipe().recipeInterfaceImpl.signIn({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                credential: {
                    ...credential.assertion,
                    response: { ...credential.assertion.response, clientDataJSON: null },
                },
                tenantId: "public",
                userContext,
            });
            assert.equal(signInResponse1.status, "INVALID_CREDENTIALS_ERROR");
        });

        it("when credential type is integer, should return the correct error if the credential is invalid", async function () {
            await initST();

            const { signUpResponse, signInOptionsResponse, credential } = await createUser(rpId, rpName, origin);

            const signInResponse2 = await getWebAuthnRecipe().recipeInterfaceImpl.signIn({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                credential: {
                    type: 1,
                    ...credential.assertion,
                },
                tenantId: "public",
                userContext,
            });
            assert.equal(signInResponse2.status, "INVALID_CREDENTIALS_ERROR");
        });
    });

    describe.skip("[getGeneratedOptions]", function () {
        it("returns all the required fields", async function () {
            await initST();

            // passing valid field
            let registerOptionsResponse = await createRegisterOptions("test@example.com");

            assert(registerOptionsResponse.status === "OK");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                userContext,
                tenantId: "public",
            });

            assert(generatedOptions.status === "OK");

            assert(generatedOptions.origin === origin);
            assert(generatedOptions.email === "test@example.com");
            assert(generatedOptions.relyingPartyId === rpId);
            assert(generatedOptions.relyingPartyName === rpName);
            assert(generatedOptions.userVerification === "preferred");
            assert(generatedOptions.userPresence === true);
            assert(typeof generatedOptions.webauthnGeneratedOptionsId === "string");
            assert(typeof generatedOptions.challenge === "string");
            assert(typeof generatedOptions.createdAt === "number");
            assert(typeof generatedOptions.expiresAt === "number");
            assert(typeof generatedOptions.timeout === "number");
        });

        it("returns the correct error if the options id is invalid", async function () {
            await initST();

            // passing valid field
            let registerOptionsResponse = await createRegisterOptions("test@example.com");

            assert(registerOptionsResponse.status === "OK");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: "invalid",
                userContext,
                tenantId: "public",
            });

            assert(generatedOptions.status === "OPTIONS_NOT_FOUND_ERROR");
        });
    });

    describe.skip("[generateRecoverAccountToken]", function () {
        it("should return an error if the user doesn't exist", async function () {
            await initST();

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: "test",
                    email: "test@supertokens.com",
                    tenantId: "public",
                    userContext,
                }
            );

            assert(generateRecoverAccountTokenResponse.status === "UNKNOWN_USER_ID_ERROR");
        });

        it("should generate a recover account token", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext,
                }
            );

            assert(generateRecoverAccountTokenResponse.status === "OK");
            assert(typeof generateRecoverAccountTokenResponse.token === "string");
        });
    });

    describe.skip("[getUserFromRecoverAccountToken]", function () {
        it("throws an error if the token is invalid", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const user = await getWebAuthnRecipe().recipeInterfaceImpl.getUserFromRecoverAccountToken({
                token: "test",
                tenantId: "public",
                userContext,
            });

            assert(user.status === "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR");
        });

        it("return the correct user", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext,
                }
            );
            assert(generateRecoverAccountTokenResponse.status === "OK");

            const getUserFromRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.getUserFromRecoverAccountToken(
                {
                    token: generateRecoverAccountTokenResponse.token,
                    tenantId: "public",
                    userContext,
                }
            );

            assert(getUserFromRecoverAccountTokenResponse.status === "OK");
            assert(!!getUserFromRecoverAccountTokenResponse.user);
            assert(!!getUserFromRecoverAccountTokenResponse.user.emails.find((e) => e === email));
        });
    });

    describe.skip("[consumeRecoverAccountToken]", function () {
        it("should return an error if the token is invalid", async function () {
            await initST();

            const consumeRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.consumeRecoverAccountToken(
                {
                    token: "test",
                    tenantId: "public",
                    userContext,
                }
            );

            assert(consumeRecoverAccountTokenResponse.status === "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR");
        });

        it("should consume the token", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext,
                }
            );
            assert(generateRecoverAccountTokenResponse.status === "OK");

            const consumeRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.consumeRecoverAccountToken(
                {
                    token: generateRecoverAccountTokenResponse.token,
                    tenantId: "public",
                    userContext,
                }
            );

            assert(consumeRecoverAccountTokenResponse.status === "OK");
            assert(consumeRecoverAccountTokenResponse.userId === signUpResponse.user.id);
            assert(consumeRecoverAccountTokenResponse.email === email);
        });
    });

    describe.skip("[registerCredential]", function () {
        it("should create a new credential for an existing user", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential,
                userContext,
            });

            assert(registerCredentialResponse.status === "OK");
        });

        it("should create multiple new credentials for an existing user", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let registerOptionsResponse1 = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse1.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential1 = createCredential(registerOptionsResponse1, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse1 = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: registerOptionsResponse1.webauthnGeneratedOptionsId,
                credential: credential1,
                userContext,
            });

            assert(registerCredentialResponse1.status === "OK");

            let registerOptionsResponse2 = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse2.status === "OK");

            const credential2 = createCredential(registerOptionsResponse2, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse2 = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: registerOptionsResponse2.webauthnGeneratedOptionsId,
                credential: credential2,
                userContext,
            });

            assert(registerCredentialResponse2.status === "OK");
        });

        it("should return a parsable error if the options id is invalid", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: "invalid",
                credential,
                userContext,
            });

            assert(registerCredentialResponse.status !== "OK");
        });

        it("should return the correct error if the credential is invalid", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential: {
                    ...credential,
                    id: "invalid",
                    response: {
                        ...credential.response,
                        clientDataJSON: "invalid",
                    },
                },
                userContext,
            });

            assert(registerCredentialResponse.status === "INVALID_CREDENTIALS_ERROR");
        });

        it("should return the correct error if the register options id is wrong", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: "invalid",
                credential: credential,
                userContext,
            });

            assert(registerCredentialResponse.status === "OPTIONS_NOT_FOUND_ERROR");
        });

        it("should return the correct error if the register options are wrong", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    // @ts-ignore
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse.status === "OK");

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId: rpId + ".co",
                rpName,
                origin: origin + ".co",
                userNotPresent: false,
                userNotVerified: false,
            });

            const registerCredentialResponse = await getWebAuthnRecipe().recipeInterfaceImpl.registerCredential({
                recipeUserId: signUpResponse.user.id,
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential: credential,
                userContext,
            });

            assert(registerCredentialResponse.status === "INVALID_OPTIONS_ERROR");
        });
    });

    describe.skip("[listCredentials]", function () {
        it("should return only one credential if only one is registered for a user", async function () {
            await initST();

            const { signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const listCredentialsResponse = await getWebAuthnRecipe().recipeInterfaceImpl.listCredentials({
                recipeUserId: signUpResponse.user.id,
                userContext,
            });
            console.log(listCredentialsResponse);

            assert(listCredentialsResponse.status === "OK");
        });
    });
});
