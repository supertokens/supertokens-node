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
const { printPath, setupST, killAllST, cleanST } = require("../utils");
let assert = require("assert");

const request = require("supertest");
const express = require("express");

let { ProcessState } = require("../../lib/build/processState");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
const { initST, origin, rpId, rpName } = require("./lib/initST");
const getWebauthnLib = require("./lib/getWebAuthnLib");
const getWebAuthnRecipe = require("./lib/getWebAuthnRecipe");
const createUser = require("./lib/createUser");

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

    describe("[getGeneratedOptions]", function () {
        it("returns an error if the email is invalid", async function () {
            await initST();

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
                        email: "",
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

            assert(registerOptionsResponse.status === "INVALID_EMAIL_ERROR");
            assert(typeof registerOptionsResponse.err === "string");
        });

        it("returns all the required fields", async function () {
            await initST();

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

            const generatedOptions = await getWebAuthnRecipe().recipeInterfaceImpl.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                userContext: {},
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
    });

    describe("[generateRecoverAccountToken]", function () {
        it("should return an error if the user doesn't exist", async function () {
            await initST();

            const generateRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.generateRecoverAccountToken(
                {
                    userId: "test",
                    email: "test@supertokens.com",
                    tenantId: "public",
                    userContext: {},
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
                    userContext: {},
                }
            );

            assert(generateRecoverAccountTokenResponse.status === "OK");
            assert(typeof generateRecoverAccountTokenResponse.token === "string");
        });
    });

    describe("[getUserFromRecoverAccountToken]", function () {
        it("throws an error if the token is invalid", async function () {
            await initST();

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const user = await getWebAuthnRecipe().recipeInterfaceImpl.getUserFromRecoverAccountToken({
                token: "test",
                tenantId: "public",
                userContext: {},
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
                    userContext: {},
                }
            );

            const getUserFromRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.getUserFromRecoverAccountToken(
                {
                    token: generateRecoverAccountTokenResponse.token,
                    tenantId: "public",
                    userContext: {},
                }
            );

            assert(getUserFromRecoverAccountTokenResponse.status === "OK");
            assert(!!getUserFromRecoverAccountTokenResponse.user);
            assert(!!getUserFromRecoverAccountTokenResponse.user.emails.find((e) => e === email));
        });
    });

    describe("[consumeRecoverAccountToken]", function () {
        it("should return an error if the token is invalid", async function () {
            await initST();

            const consumeRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.consumeRecoverAccountToken(
                {
                    token: "test",
                    tenantId: "public",
                    userContext: {},
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
                    userContext: {},
                }
            );

            const consumeRecoverAccountTokenResponse = await getWebAuthnRecipe().recipeInterfaceImpl.consumeRecoverAccountToken(
                {
                    token: generateRecoverAccountTokenResponse.token,
                    tenantId: "public",
                    userContext: {},
                }
            );

            assert(consumeRecoverAccountTokenResponse.status === "OK");
            assert(consumeRecoverAccountTokenResponse.userId === signUpResponse.user.id);
            assert(consumeRecoverAccountTokenResponse.email === email);
        });
    });

    describe("[registerCredential]", function () {
        it("should create a new credential for an existing user", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

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
                userContext: {},
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
                userContext: {},
            });

            assert(registerCredentialResponse1.status === "OK");

            let registerOptionsResponse2 = await new Promise((resolve, reject) =>
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
                userContext: {},
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
                credential,
                userContext: {},
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
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                credential: {
                    ...credential,
                    id: "invalid",
                    response: {
                        ...credential.response,
                        clientDataJSON: "invalid",
                    },
                },
                userContext: {},
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
                userContext: {},
            });

            assert(registerCredentialResponse.status === "GENERATED_OPTIONS_NOT_FOUND_ERROR");
        });

        it("should return the correct error if the register options are wrong", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

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
                userContext: {},
            });

            assert(registerCredentialResponse.status === "INVALID_GENERATED_OPTIONS_ERROR");
        });
    });

    describe("[listCredentials]", function () {
        it("should return only one credential if only one is registered for a user", async function () {
            await initST();

            const { email, signUpResponse } = await createUser(rpId, rpName, origin);

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const listCredentialsResponse = await getWebAuthnRecipe().recipeInterfaceImpl.listCredentials({
                recipeUserId: signUpResponse.user.id,
                tenantId: "public",
                userContext: {},
            });
            console.log(listCredentialsResponse);

            assert(listCredentialsResponse.status === "OK");
        });
    });
});
