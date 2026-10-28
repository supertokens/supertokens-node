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

/**
 * From CDI 5.5 the core consumes the sign in options on a successful sign in, so the
 * same assertion cannot be verified twice. On older cores the behaviour is unchanged.
 *
 * The assertions use signCount 0 (Apple/Google passkey behaviour) so that a replay is
 * not rejected by the core's signature-counter clone detection on older cores.
 */

const { printPath, createCoreApplication, resetAll, isCDIVersionCompatible } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let WebAuthn = require("../../recipe/webauthn");
let Session = require("../../recipe/session");
const request = require("supertest");
const express = require("express");
const { middleware, errorHandler } = require("../../framework/express");
const createSoftAuthenticator = require("./lib/softAuthenticator");

const RP_ID = "supertokens.io";
const ORIGIN = "https://supertokens.io";

async function initSTAndGetApp() {
    const connectionURI = await createCoreApplication();
    STExpress.init({
        supertokens: { connectionURI },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            WebAuthn.init({
                getRelyingPartyId: async () => RP_ID,
                getOrigin: async () => ORIGIN,
            }),
            Session.init(),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
}

function post(app, path, body) {
    return new Promise((resolve, reject) =>
        request(app)
            .post(path)
            .send(body)
            .expect(200)
            .end((err, res) => (err ? reject(err) : resolve(JSON.parse(res.text))))
    );
}

async function registerUser(app, authenticator) {
    const email = `${Math.random().toString().slice(2)}@supertokens.com`;

    const registerOptions = await post(app, "/auth/webauthn/options/register", { email });
    assert.strictEqual(registerOptions.status, "OK");

    const signUpResponse = await post(app, "/auth/webauthn/signup", {
        credential: authenticator.createAttestation(registerOptions, { signCount: 0 }),
        webauthnGeneratedOptionsId: registerOptions.webauthnGeneratedOptionsId,
        shouldTryLinkingWithSessionUser: false,
    });
    assert.strictEqual(signUpResponse.status, "OK");

    return { email, userHandle: registerOptions.user.id };
}

describe(`signInSingleUseOptions: ${printPath("[test/webauthn/signInSingleUseOptions.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
        resetAll();
    });

    it("a replayed assertion is OPTIONS_NOT_FOUND_ERROR from verifyCredentials on CDI >= 5.5", async function () {
        const app = await initSTAndGetApp();
        const optionsAreSingleUse = await isCDIVersionCompatible("5.5");
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator);

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});
        assert.strictEqual(signInOptions.status, "OK");
        const credential = authenticator.createAssertion(signInOptions, { signCount: 0, userHandle });

        const first = await WebAuthn.verifyCredentials({
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            credential,
            tenantId: "public",
        });
        assert.strictEqual(first.status, "OK");

        const replay = await WebAuthn.verifyCredentials({
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            credential,
            tenantId: "public",
        });
        assert.strictEqual(replay.status, optionsAreSingleUse ? "OPTIONS_NOT_FOUND_ERROR" : "OK");
    });

    it("an override calling verifyCredentials and then signIn gets OPTIONS_NOT_FOUND_ERROR on CDI >= 5.5", async function () {
        const app = await initSTAndGetApp();
        const optionsAreSingleUse = await isCDIVersionCompatible("5.5");
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator);

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});
        const credential = authenticator.createAssertion(signInOptions, { signCount: 0, userHandle });
        const input = {
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            credential,
            tenantId: "public",
        };

        assert.strictEqual((await WebAuthn.verifyCredentials(input)).status, "OK");
        const signInResult = await WebAuthn.signIn({
            ...input,
            session: undefined,
            shouldTryLinkingWithSessionUser: false,
        });
        assert.strictEqual(signInResult.status, optionsAreSingleUse ? "OPTIONS_NOT_FOUND_ERROR" : "OK");
    });

    it("a replayed assertion is INVALID_CREDENTIALS_ERROR from the sign in API on CDI >= 5.5", async function () {
        const app = await initSTAndGetApp();
        const optionsAreSingleUse = await isCDIVersionCompatible("5.5");
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator);

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});
        const body = {
            credential: authenticator.createAssertion(signInOptions, { signCount: 0, userHandle }),
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            shouldTryLinkingWithSessionUser: false,
        };

        const first = await post(app, "/auth/webauthn/signin", body);
        assert.strictEqual(first.status, "OK", "Got: " + JSON.stringify(first));

        const replay = await post(app, "/auth/webauthn/signin", body);
        assert.strictEqual(
            replay.status,
            optionsAreSingleUse ? "INVALID_CREDENTIALS_ERROR" : "OK",
            "Got: " + JSON.stringify(replay)
        );
    });

    it("a failed sign in attempt leaves the options usable", async function () {
        const app = await initSTAndGetApp();
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator);

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});
        const otherOptions = await post(app, "/auth/webauthn/options/signin", {});

        // An assertion over another challenge fails verification against these options
        const failed = await WebAuthn.verifyCredentials({
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            credential: authenticator.createAssertion(otherOptions, { signCount: 0, userHandle }),
            tenantId: "public",
        });
        assert.notStrictEqual(failed.status, "OK");
        assert.notStrictEqual(failed.status, "OPTIONS_NOT_FOUND_ERROR");

        const failedAPI = await post(app, "/auth/webauthn/signin", {
            credential: authenticator.createAssertion(otherOptions, { signCount: 0, userHandle }),
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            shouldTryLinkingWithSessionUser: false,
        });
        assert.strictEqual(failedAPI.status, "INVALID_CREDENTIALS_ERROR");

        const signInResponse = await post(app, "/auth/webauthn/signin", {
            credential: authenticator.createAssertion(signInOptions, { signCount: 0, userHandle }),
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            shouldTryLinkingWithSessionUser: false,
        });
        assert.strictEqual(signInResponse.status, "OK", "Got: " + JSON.stringify(signInResponse));
    });
});
