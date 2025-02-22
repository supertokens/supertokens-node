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
const { printPath, setupST, startST, killAllST, cleanST, stopST } = require("../utils");
const assert = require("assert");

const request = require("supertest");
const express = require("express");

const STExpress = require("../../");
const WebAuthn = require("../../recipe/webauthn");
const { ProcessState } = require("../../lib/build/processState");
const { middleware, errorHandler } = require("../../framework/express");
const { isCDIVersionCompatible } = require("../utils");
const getWebauthnLib = require("./lib/getWebAuthnLib");
const getWebAuthnRecipe = require("./lib/getWebAuthnRecipe");
const createUser = require("./lib/createUser");
const { initST, origin, rpId, rpName } = require("./lib/initST");
const createRegisterOptions = require("./lib/createRegisterOptions");
const createSignInOptions = require("./lib/createSignInOptions");

describe(`apisFunctions: ${printPath("[test/webauthn/apis.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("[registerOptionsPOST]", function () {
        it("test registerOptions with default values", async function () {
            await initST({ origin: null, rpId: null, rpName: null });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/register")
                    .send({
                        email: "test@example.com",
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

            assert.equal(registerOptionsResponse.status, "OK");

            assert.equal(typeof registerOptionsResponse.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof registerOptionsResponse.challenge, "string");
            assert.equal(registerOptionsResponse.attestation, "none");
            assert.equal(registerOptionsResponse.rp.id, "api.supertokens.io");
            assert.equal(registerOptionsResponse.rp.name, "SuperTokens");
            assert.equal(registerOptionsResponse.user.name, "test@example.com");
            assert.equal(registerOptionsResponse.user.displayName, "test@example.com");
            assert(Number.isInteger(registerOptionsResponse.timeout));
            assert.equal(registerOptionsResponse.authenticatorSelection.userVerification, "preferred");
            assert.equal(registerOptionsResponse.authenticatorSelection.requireResidentKey, true);
            assert.equal(registerOptionsResponse.authenticatorSelection.residentKey, "required");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert.equal(generatedOptions.origin, "https://api.supertokens.io");
        });

        it("test registerOptions with custom values", async function () {
            const connectionURI = await startST();

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
                    WebAuthn.init({
                        getOrigin: () => {
                            return "https://test.testId.com";
                        },
                        getRelyingPartyId: () => {
                            return "testOrigin.com"; // this should be ignored
                        },
                        getRelyingPartyName: () => {
                            return "testName";
                        },
                        validateEmailAddress: (email) => {
                            return email === "test@example.com" ? undefined : "Invalid email";
                        },
                        override: {
                            functions: (originalImplementation) => {
                                return {
                                    ...originalImplementation,
                                    registerOptions: (input) => {
                                        return originalImplementation.registerOptions({
                                            ...input,
                                            timeout: 10 * 1000,
                                            userVerification: "required",
                                            relyingPartyId: "testId.com",
                                            userPresence: false,
                                        });
                                    },
                                };
                            },
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/register")
                    .send({
                        email: "test@example.com",
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

            assert.equal(registerOptionsResponse.status, "OK");

            assert.equal(typeof registerOptionsResponse.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof registerOptionsResponse.challenge, "string");
            assert.equal(registerOptionsResponse.attestation, "none");
            assert.equal(registerOptionsResponse.rp.id, "testId.com");
            assert.equal(registerOptionsResponse.rp.name, "testName");
            assert.equal(registerOptionsResponse.user.name, "test@example.com");
            assert.equal(registerOptionsResponse.user.displayName, "test@example.com");
            assert.equal(Number.isInteger(registerOptionsResponse.timeout), true);
            assert.equal(registerOptionsResponse.authenticatorSelection.userVerification, "required");
            assert.equal(registerOptionsResponse.authenticatorSelection.requireResidentKey, true);
            assert.equal(registerOptionsResponse.authenticatorSelection.residentKey, "required");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert.equal(generatedOptions.origin, "https://test.testId.com");
            assert.equal(generatedOptions.userPresence, false);
        });
    });

    describe("[signInOptionsPOST]", function () {
        it("test signInOptions with default values", async function () {
            await initST({ origin: null, rpId: null, rpName: null });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const signInOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/signin")
                    .send({ email: "test@example.com" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert.equal(signInOptionsResponse.status, "OK");

            assert.equal(typeof signInOptionsResponse.challenge, "string");
            assert.equal(Number.isInteger(signInOptionsResponse.timeout), true);
            assert.equal(Number.isInteger(signInOptionsResponse.createdAt), true);
            assert.equal(Number.isInteger(signInOptionsResponse.expiresAt), true);
            assert.equal(signInOptionsResponse.userVerification, "preferred");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert.equal(generatedOptions.relyingPartyId, "api.supertokens.io");
            assert.equal(generatedOptions.origin, "https://api.supertokens.io");
        });

        it("test signInOptions with custom values", async function () {
            const connectionURI = await startST();

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
                    WebAuthn.init({
                        getOrigin: () => {
                            return "https://test.testOrigin.com";
                        },
                        getRelyingPartyId: () => {
                            return "testOrigin.com"; // this should be ignored
                        },
                        getRelyingPartyName: () => {
                            return "testName";
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const signInOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/signin")
                    .send({ email: "test@example.com" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert.equal(signInOptionsResponse.status, "OK");

            assert.equal(typeof signInOptionsResponse.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof signInOptionsResponse.challenge, "string");
            assert.equal(Number.isInteger(signInOptionsResponse.timeout), true);
            assert.equal(Number.isInteger(signInOptionsResponse.createdAt), true);
            assert.equal(Number.isInteger(signInOptionsResponse.expiresAt), true);
            assert.equal(signInOptionsResponse.userVerification, "preferred");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert.equal(generatedOptions.relyingPartyId, "testOrigin.com");
            assert.equal(generatedOptions.origin, "https://test.testOrigin.com");
        });
    });

    describe("[signUpPOST]", function () {
        it("test signUp with no account linking", async function () {
            await initST();

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            const registerOptionsResponse = await createRegisterOptions(email);

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const signUpResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/signup")
                    .send({
                        credential,
                        webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                        shouldTryLinkingWithSessionUser: false,
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

            assert.equal(signUpResponse.status, "OK");

            assert.equal(typeof registerOptionsResponse.webauthnGeneratedOptionsId, "string");
            assert.equal(typeof signUpResponse?.user?.id, "string");
            assert.deepEqual(signUpResponse?.user?.emails, [email]);
            assert.deepEqual(signUpResponse?.user?.webauthn?.credentialIds, [credential.id]);
            assert.equal(signUpResponse?.user?.loginMethods?.[0]?.email, email);
            assert.deepEqual(signUpResponse?.user?.loginMethods?.[0]?.webauthn?.credentialIds, [credential.id]);
        });
    });

    describe("[signInPOST]", function () {
        it("test signIn with no account linking", async function () {
            await initST();

            const { email, credential, signInOptionsResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const signInResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/signin")
                    .send({
                        credential: credential.assertion,
                        webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                        shouldTryLinkingWithSessionUser: false,
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

            assert.equal(signInResponse.status, "OK");

            assert.equal(typeof signInResponse?.user?.id, "string");
            assert.deepEqual(signInResponse?.user?.emails, [email]);
            assert.deepEqual(signInResponse?.user?.webauthn?.credentialIds, [credential.attestation.id]);
            assert.equal(signInResponse?.user?.loginMethods?.[0]?.email, email);
            assert.deepEqual(signInResponse?.user?.loginMethods?.[0]?.webauthn?.credentialIds, [
                credential.attestation.id,
            ]);
        });

        it("test signIn fail with wrong credential", async function () {
            await initST();

            const { createAndAssertCredential } = await getWebauthnLib();
            const { email } = await createUser(rpId, rpName, origin);

            const registerOptionsResponse = await createRegisterOptions(email);
            const signInOptionsResponse = await createSignInOptions();

            const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const signInResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/signin")
                    .send({
                        credential: credential.assertion,
                        webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                        shouldTryLinkingWithSessionUser: false,
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

            assert.equal(signInResponse.status, "INVALID_CREDENTIALS_ERROR");
        });

        it("should fail signIn if there is no credential registered for the user", async function () {});

        it("should allow signIn multiple times with the same credential", async function () {});
    });

    describe("[generateRecoverAccountTokenPOST]", function () {
        it("should return successfully for an existing user", async function () {
            await initST();

            const { email } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const generateRecoverAccountTokenResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset/token")
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
            assert.equal(generateRecoverAccountTokenResponse.status, "OK");
        });

        it("should return successfully for a non-existing user", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const generateRecoverAccountTokenResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset/token")
                    .send({
                        email: "invalid@supertokens.com",
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

            assert.equal(generateRecoverAccountTokenResponse.status, "OK");
        });
    });

    describe("[recoverAccountPOST]", function () {
        it("should set a new credential for a user that recovered their account", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext: {},
                }
            );
            const token = generateRecoverAccountTokenResponse.token;

            const registerOptionsResponse = await createRegisterOptions(email);

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token,
                        credential,
                        webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
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

            assert.equal(recoverAccountResponse.status, "OK");
        });

        it("should return the correct error if the token is invalid", async function () {
            await initST();

            const { email } = await createUser(rpId, rpName, origin);

            const registerOptionsResponse = await createRegisterOptions(email);

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token: "invalid",
                        credential,
                        webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
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

            assert.equal(recoverAccountResponse.status, "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR");
        });

        it("should return the correct error if the credential is invalid", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext: {},
                }
            );

            const registerOptionsResponse = await createRegisterOptions(email);
            const webauthnGeneratedOptionsId = registerOptionsResponse.webauthnGeneratedOptionsId;

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token: generateRecoverAccountTokenResponse.token,
                        credential: {
                            ...credential,
                            id: "invalid",
                            response: {
                                ...credential.response,
                                clientDataJSON: "invalid",
                            },
                        },
                        webauthnGeneratedOptionsId,
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

            assert.equal(recoverAccountResponse.status, "INVALID_CREDENTIALS_ERROR");
        });

        it("should return the correct error if the register options id is wrong", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext: {},
                }
            );

            const registerOptionsResponse = await createRegisterOptions(email);

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token: generateRecoverAccountTokenResponse.token,
                        credential,
                        webauthnGeneratedOptionsId: "invalid",
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

            assert.equal(recoverAccountResponse.status, "OPTIONS_NOT_FOUND_ERROR");
        });

        it("should return the correct error if the register options are wrong", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: signUpResponse.user.id,
                    email,
                    tenantId: "public",
                    userContext: {},
                }
            );

            const registerOptionsResponse = await createRegisterOptions(email);

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId: rpId + ".co",
                rpName,
                origin: origin + ".co",
                userNotPresent: false,
                userNotVerified: false,
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token: generateRecoverAccountTokenResponse.token,
                        credential,
                        webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
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

            assert.equal(recoverAccountResponse.status, "INVALID_AUTHENTICATOR_ERROR");
        });
    });
});
