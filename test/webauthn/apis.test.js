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
let assert = require("assert");

const request = require("supertest");
const express = require("express");

let STExpress = require("../../");
let WebAuthn = require("../../recipe/webauthn");
let { ProcessState } = require("../../lib/build/processState");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
const getWebauthnLib = require("./lib/getWebAuthnLib");
const getWebAuthnRecipe = require("./lib/getWebAuthnRecipe");
const createUser = require("./lib/createUser");
const { initST, origin, rpId, rpName } = require("./lib/initST");

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
            await initST(false);

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            // passing valid field
            let registerOptionsResponse = await new Promise((resolve, reject) =>
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

            assert(registerOptionsResponse.status === "OK");

            assert(typeof registerOptionsResponse.webauthnGeneratedOptionsId === "string");
            assert(typeof registerOptionsResponse.challenge === "string");
            assert(registerOptionsResponse.attestation === "none");
            assert(registerOptionsResponse.rp.id === "api.supertokens.io");
            assert(registerOptionsResponse.rp.name === "SuperTokens");
            assert(registerOptionsResponse.user.name === "test@example.com");
            assert(registerOptionsResponse.user.displayName === "test@example.com");
            assert(Number.isInteger(registerOptionsResponse.timeout));
            assert(registerOptionsResponse.authenticatorSelection.userVerification === "preferred");
            assert(registerOptionsResponse.authenticatorSelection.requireResidentKey === true);
            assert(registerOptionsResponse.authenticatorSelection.residentKey === "required");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert(generatedOptions.origin === "https://supertokens.io");
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
                            return "testOrigin.com";
                        },
                        getRelyingPartyId: () => {
                            return "testId.com";
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

            // passing valid field
            let registerOptionsResponse = await new Promise((resolve, reject) =>
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

            assert(registerOptionsResponse.status === "OK");

            assert(typeof registerOptionsResponse.webauthnGeneratedOptionsId === "string");
            assert(typeof registerOptionsResponse.challenge === "string");
            assert(registerOptionsResponse.attestation === "none");
            assert(registerOptionsResponse.rp.id === "testId.com");
            assert(registerOptionsResponse.rp.name === "testName");
            assert(registerOptionsResponse.user.name === "test@example.com");
            assert(registerOptionsResponse.user.displayName === "test@example.com");
            assert(Number.isInteger(registerOptionsResponse.timeout));
            assert(registerOptionsResponse.authenticatorSelection.userVerification === "preferred");
            assert(registerOptionsResponse.authenticatorSelection.requireResidentKey === true);
            assert(registerOptionsResponse.authenticatorSelection.residentKey === "required");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });
            assert(generatedOptions.origin === "testOrigin.com");
            assert(generatedOptions.userPresence === false);
        });
    });

    describe("[signInOptionsPOST]", function () {
        it("test signInOptions with default values", async function () {
            await initST(false);

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            // passing valid field
            let signInOptionsResponse = await new Promise((resolve, reject) =>
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

            assert(signInOptionsResponse.status === "OK");

            assert(typeof signInOptionsResponse.challenge === "string");
            assert(Number.isInteger(signInOptionsResponse.timeout));
            assert(Number.isInteger(signInOptionsResponse.createdAt));
            assert(Number.isInteger(signInOptionsResponse.expiresAt));
            assert(signInOptionsResponse.userVerification === "preferred");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert(generatedOptions.relyingPartyId === "api.supertokens.io");
            assert(generatedOptions.origin === "https://supertokens.io");
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
                            return "testOrigin.com";
                        },
                        getRelyingPartyId: () => {
                            return "testId.com";
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

            // passing valid field
            let signInOptionsResponse = await new Promise((resolve, reject) =>
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

            assert(signInOptionsResponse.status === "OK");

            assert(typeof signInOptionsResponse.webauthnGeneratedOptionsId === "string");
            assert(typeof signInOptionsResponse.challenge === "string");
            assert(Number.isInteger(signInOptionsResponse.timeout));
            assert(Number.isInteger(signInOptionsResponse.createdAt));
            assert(Number.isInteger(signInOptionsResponse.expiresAt));
            assert(signInOptionsResponse.userVerification === "preferred");

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
            });

            assert(generatedOptions.relyingPartyId === "testId.com");
            assert(generatedOptions.origin === "testOrigin.com");
        });
    });

    describe("[signUpPOST]", function () {
        it("test signUp with no account linking", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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

            let signUpResponse = await new Promise((resolve, reject) =>
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

            assert(signUpResponse.status === "OK");

            assert(typeof registerOptionsResponse.webauthnGeneratedOptionsId === "string");
            assert(signUpResponse?.user?.id !== undefined);
            assert(signUpResponse?.user?.emails?.length === 1);
            assert(signUpResponse?.user?.emails?.[0] === email);
            assert(signUpResponse?.user?.webauthn?.credentialIds?.length === 1);
            assert(signUpResponse?.user?.webauthn?.credentialIds?.[0] === credential.id);
            assert(signUpResponse?.user?.loginMethods?.[0]?.webauthn?.credentialIds?.length === 1);
            assert(signUpResponse?.user?.loginMethods?.[0]?.webauthn?.credentialIds?.[0] === credential.id);
        });
    });

    describe("[signInPOST]", function () {
        it("test signIn with no account linking", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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

            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/signin")
                    .send({ email })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert(signInOptionsResponse.status === "OK");

            const { createAndAssertCredential } = await getWebauthnLib();
            const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let signUpResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/signup")
                    .send({
                        credential: credential.attestation,
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

            assert(signUpResponse.status === "OK");

            let signInResponse = await new Promise((resolve, reject) =>
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

            assert(signInResponse.status === "OK");

            assert(signInResponse?.user?.id !== undefined);
            assert(signInResponse?.user?.emails?.length === 1);
            assert(signInResponse?.user?.emails?.[0] === email);
            assert(signInResponse?.user?.webauthn?.credentialIds?.length === 1);
            assert(signInResponse?.user?.webauthn?.credentialIds?.[0] === credential.attestation.id);
        });

        it("test signIn fail with wrong credential", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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

            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/signin")
                    .send({ email: email + "wrong" })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert(signInOptionsResponse.status === "OK");

            const { createAndAssertCredential } = await getWebauthnLib();
            const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let signUpResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/signup")
                    .send({
                        credential: credential.attestation,
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

            assert(signUpResponse.status === "OK");

            let signInResponse = await new Promise((resolve, reject) =>
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

            assert(signInResponse.status === "INVALID_CREDENTIALS_ERROR");
        });

        it("should fail signIn if there is no credential registered for the user", async function () {});
        it("should allow signIn multiple times with the same credential", async function () {});
    });

    describe("[generateRecoverAccountTokenPOST]", function () {
        it("should return successfully for an existing user", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const { email } = await createUser(rpId, rpName, origin);

            let generateRecoverAccountTokenResponse = await new Promise((resolve, reject) =>
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
            assert(generateRecoverAccountTokenResponse.status === "OK");
            // todo figure out how to test the token actually being generated
        });

        it("should return successfully for a non-existing user", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let generateRecoverAccountTokenResponse = await new Promise((resolve, reject) =>
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
            assert(generateRecoverAccountTokenResponse.status === "OK");
        });
    });

    describe("[recoverAccountPOST]", function () {
        it("should set a new credential for a user that recovered their account", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

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

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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
            const webauthnGeneratedOptionsId = registerOptionsResponse.webauthnGeneratedOptionsId;

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token,
                        credential,
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
            assert(recoverAccountResponse.status === "OK");
        });

        it("should return the correct error if the token is invalid", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const { email } = await createUser(rpId, rpName, origin);

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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
            const webauthnGeneratedOptionsId = registerOptionsResponse.webauthnGeneratedOptionsId;

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token: "invalid",
                        credential,
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
            assert(recoverAccountResponse.status === "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR");
        });

        it("should return the correct error if the credential is invalid", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

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

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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
            const webauthnGeneratedOptionsId = registerOptionsResponse.webauthnGeneratedOptionsId;

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token,
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
            assert(recoverAccountResponse.status === "INVALID_CREDENTIALS_ERROR");
        });

        it("should return the correct error if the register options id is wrong", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

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

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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
            const webauthnGeneratedOptionsId = registerOptionsResponse.webauthnGeneratedOptionsId;

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token,
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
            assert(recoverAccountResponse.status === "INVALID_GENERATED_OPTIONS_ERROR");
        });

        it("should return the correct error if the register options are wrong", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

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

            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
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
            const webauthnGeneratedOptionsId = registerOptionsResponse.webauthnGeneratedOptionsId;

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId: rpId + ".co",
                rpName,
                origin: origin + ".co",
                userNotPresent: false,
                userNotVerified: false,
            });

            let recoverAccountResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/webauthn/reset")
                    .send({
                        token,
                        credential,
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
            assert(recoverAccountResponse.status === "INVALID_GENERATED_OPTIONS_ERROR");
        });
    });
});
