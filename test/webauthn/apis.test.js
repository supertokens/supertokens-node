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
let Session = require("../../recipe/session");
let WebAuthn = require("../../recipe/webauthn");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
const { readFile } = require("fs/promises");
const nock = require("nock");

require("./wasm_exec");

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

    describe("[registerOptions]", function () {
        it("test registerOptions with default values", async function () {
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

            console.log("test registerOptions with default values", registerOptionsResponse);

            assert(registerOptionsResponse.status === "OK");

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

            const generatedOptions = await SuperTokens.getInstanceOrThrowError().recipeModules[0].recipeInterfaceImpl.getGeneratedOptions(
                {
                    webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                    userContext: {},
                }
            );

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
                                    signInOptions: (input) => {
                                        return originalImplementation.signInOptions({
                                            ...input,
                                            timeout: 10 * 1000,
                                            userVerification: "required",
                                            relyingPartyId: "testId.com",
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
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            console.log("test registerOptions with custom values", registerOptionsResponse);

            assert(registerOptionsResponse.status === "OK");

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

            const generatedOptions = await SuperTokens.getInstanceOrThrowError().recipeModules[0].recipeInterfaceImpl.getGeneratedOptions(
                {
                    webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                    userContext: {},
                }
            );
            console.log("generatedOptions", generatedOptions);
            assert(generatedOptions.origin === "testOrigin.com");
        });
    });

    describe("[signInOptions]", function () {
        it("test signInOptions with default values", async function () {
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
            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/webauthn/options/signin")
                    .send({ email: "test@example.com" })
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
            console.log("test signInOptions with default values", signInOptionsResponse);

            assert(signInOptionsResponse.status === "OK");

            assert(typeof signInOptionsResponse.challenge === "string");
            assert(Number.isInteger(signInOptionsResponse.timeout));
            assert(signInOptionsResponse.userVerification === "preferred");

            const generatedOptions = await SuperTokens.getInstanceOrThrowError().recipeModules[0].recipeInterfaceImpl.getGeneratedOptions(
                {
                    webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                    userContext: {},
                }
            );
            console.log("generatedOptions", generatedOptions);

            assert(generatedOptions.rpId === "supertokens.io");
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
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            console.log("test signInOptions with custom values", signInOptionsResponse);

            assert(signInOptionsResponse.status === "OK");

            assert(typeof signInOptionsResponse.challenge === "string");
            assert(Number.isInteger(signInOptionsResponse.timeout));
            assert(signInOptionsResponse.userVerification === "preferred");

            const generatedOptions = await SuperTokens.getInstanceOrThrowError().recipeModules[0].recipeInterfaceImpl.getGeneratedOptions(
                {
                    webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
                    userContext: {},
                }
            );
            console.log("generatedOptions", generatedOptions);

            assert(generatedOptions.rpId === "testId.com");
            assert(generatedOptions.origin === "testOrigin.com");
        });
    });

    describe("[signUp]", function () {
        it("test signUp with no account linking", async function () {
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
                            console.log(err);
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
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(signUpResponse.status === "OK");

            assert(signUpResponse?.user?.id !== undefined);
            assert(signUpResponse?.user?.emails?.length === 1);
            assert(signUpResponse?.user?.emails?.[0] === email);
            assert(signUpResponse?.user?.webauthn?.credentialIds?.length === 1);
            assert(signUpResponse?.user?.webauthn?.credentialIds?.[0] === credential.id);
        });
    });

    describe("[signIn]", function () {
        it("test signIn with no account linking", async function () {
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
                            console.log(err);
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
                            console.log(err);
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
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(signUpResponse.status === "OK");

            // todo remove this when the core is implemented
            // mock the core to return the user
            nock("http://localhost:8080/", { allowUnmocked: true })
                .get("/public/users/by-accountinfo")
                .query({ email, doUnionOfAccountInfo: true })
                .reply(200, (uri, body) => {
                    return { status: "OK", users: [signUpResponse.user] };
                })
                .get("/user/id")
                .query({ userId: signUpResponse.user.id })
                .reply(200, (uri, body) => {
                    return { status: "OK", user: signUpResponse.user };
                });

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
                            console.log(err);
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
                            console.log(err);
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
                            console.log(err);
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
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(signUpResponse.status === "OK");

            // todo remove this when the core is implemented
            // mock the core to return the user
            nock("http://localhost:8080/", { allowUnmocked: true })
                .get("/public/users/by-accountinfo")
                .query({ email, doUnionOfAccountInfo: true })
                .reply(200, (uri, body) => {
                    return { status: "OK", users: [signUpResponse.user] };
                })
                .get("/user/id")
                .query({ userId: signUpResponse.user.id })
                .reply(200, (uri, body) => {
                    return { status: "OK", user: signUpResponse.user };
                });

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
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(signInResponse.status === "INVALID_CREDENTIALS_ERROR");
        });
    });
});

const getWebauthnLib = async () => {
    const wasmBuffer = await readFile(__dirname + "/webauthn.wasm");

    // Set up the WebAssembly module instance
    const go = new Go();
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    go.run(instance);

    // Export extractURL from the global object
    const createCredential = (
        registerOptions,
        { userNotPresent = true, userNotVerified = true, rpId, rpName, origin }
    ) => {
        const registerOptionsString = JSON.stringify(registerOptions);
        const result = global.createCredential(
            registerOptionsString,
            rpId,
            rpName,
            origin,
            userNotPresent,
            userNotVerified
        );

        if (!result) {
            throw new Error("Failed to create credential");
        }

        try {
            const credential = JSON.parse(result);
            return credential;
        } catch (e) {
            throw new Error("Failed to parse credential");
        }
    };

    const createAndAssertCredential = (
        registerOptions,
        signInOptions,
        { userNotPresent = false, userNotVerified = false, rpId, rpName, origin }
    ) => {
        const registerOptionsString = JSON.stringify(registerOptions);
        const signInOptionsString = JSON.stringify(signInOptions);

        const result = global.createAndAssertCredential(
            registerOptionsString,
            signInOptionsString,
            rpId,
            rpName,
            origin,
            userNotPresent,
            userNotVerified
        );

        if (!result) {
            throw new Error("Failed to create/assert credential");
        }

        try {
            const parsedResult = JSON.parse(result);
            return { attestation: parsedResult.attestation, assertion: parsedResult.assertion };
        } catch (e) {
            throw new Error("Failed to parse result");
        }
    };

    return { createCredential, createAndAssertCredential };
};

const log = ({ ...args }) => {
    Object.keys(args).forEach((key) => {
        console.log();
        console.log("------------------------------------------------");
        console.log(`${key}`);
        console.log("------------------------------------------------");
        console.log(JSON.stringify(args[key], null, 2));
        console.log("================================================");
        console.log();
    });
};
