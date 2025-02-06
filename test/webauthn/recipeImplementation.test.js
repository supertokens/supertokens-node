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

let STExpress = require("../..");
let Session = require("../../recipe/session");
let WebAuthn = require("../../recipe/webauthn");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");

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
                recipeList: [WebAuthn.init()],
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
                        email: "",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
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
                recipeList: [WebAuthn.init()],
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
                            console.log(err);
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

            assert(generatedOptions.origin === "https://supertokens.io");
            assert(generatedOptions.email === "test@example.com");
            assert(generatedOptions.relyingPartyId === "api.supertokens.io");
            assert(generatedOptions.relyingPartyName === "SuperTokens");
            assert(typeof generatedOptions.webauthnGeneratedOptionsId === "string");
            assert(typeof generatedOptions.challenge === "string");
            assert(typeof generatedOptions.createdAt === "number");
            assert(typeof generatedOptions.expiresAt === "number");
            assert(typeof generatedOptions.timeout === "number");
        });
    });

    describe("[generateRecoverAccountToken]", function () {
        it("should return an error if the user doesn't exist", async function () {
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
                recipeList: [WebAuthn.init()],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
                            console.log(err);
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

        it("should return a parsable error if the options id is invalid", async function () {
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
                            console.log(err);
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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
                            console.log(err);
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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
                            console.log(err);
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
            const connectionURI = await startST();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

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
                    Session.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin;
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            if (!(await isCDIVersionCompatible("2.11"))) return;

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
                            console.log(err);
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
});
