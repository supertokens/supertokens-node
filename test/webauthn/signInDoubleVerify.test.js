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
 * Reproduces https://github.com/supertokens/supertokens-core/issues/1195
 *
 * signInPOST verifies the same assertion twice against the core
 * (verifyCredentials at the top, then signIn -> verifyCredentials again).
 * The core persists the signature counter on every verification, so the
 * second call presents a non-increasing signCount and webauthn4j rejects it
 * as a cloned authenticator ("Malicious counter value is detected...").
 *
 * This only triggers for authenticators that actually increment signCount
 * (Windows Hello, security keys, Chrome virtual authenticators). Apple and
 * Google passkeys keep signCount at 0 forever, which skips the check and
 * hides the bug — hence the control tests below.
 */

const { printPath, createCoreApplication, resetAll } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let WebAuthn = require("../../recipe/webauthn");
let Session = require("../../recipe/session");
const request = require("supertest");
const express = require("express");
const { middleware, errorHandler } = require("../../framework/express");
const createSoftAuthenticator = require("./lib/softAuthenticator");

// Must be a consistent pair: the core validates that the origin host ends with
// the relying party id. (The defaults derived from appInfo — rpId=apiDomain
// host, origin=websiteDomain — do NOT satisfy this, so we set them explicitly.)
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

// Registers a fresh user+passkey whose stored counter starts at `signCount`.
async function registerUser(app, authenticator, { signCount }) {
    const email = `${Math.random().toString().slice(2)}@supertokens.com`;

    const registerOptions = await post(app, "/auth/webauthn/options/register", { email });
    assert.strictEqual(registerOptions.status, "OK");

    const signUpResponse = await post(app, "/auth/webauthn/signup", {
        credential: authenticator.createAttestation(registerOptions, { signCount }),
        webauthnGeneratedOptionsId: registerOptions.webauthnGeneratedOptionsId,
        shouldTryLinkingWithSessionUser: false,
    });
    assert.strictEqual(signUpResponse.status, "OK");

    return { email, userHandle: registerOptions.user.id };
}

describe(`signInDoubleVerify: ${printPath("[test/webauthn/signInDoubleVerify.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
        resetAll();
    });

    /**
     * THE REPRODUCTION — fails on current main with INVALID_CREDENTIALS_ERROR.
     *
     * A single, perfectly legitimate sign-in API call with an authenticator
     * that increments its signature counter must succeed. Today the second
     * internal verification sees the already-persisted counter and the core
     * returns INVALID_AUTHENTICATOR_ERROR ("Malicious counter value is
     * detected. Cloned authenticators exist in parallel."), which signInPOST
     * masks as INVALID_CREDENTIALS_ERROR.
     */
    it("single sign-in API call succeeds with a counter-incrementing authenticator (core#1195)", async function () {
        const app = await initSTAndGetApp();
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator, { signCount: 1 });

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});
        assert.strictEqual(signInOptions.status, "OK");

        // ONE sign-in with the counter correctly incremented past the stored value.
        const signInResponse = await post(app, "/auth/webauthn/signin", {
            credential: authenticator.createAssertion(signInOptions, { signCount: 2, userHandle }),
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            shouldTryLinkingWithSessionUser: false,
        });

        assert.strictEqual(
            signInResponse.status,
            "OK",
            "A single sign-in with an incrementing signCount must succeed. " +
                "Failure here means signInPOST verified the assertion twice against the core " +
                "and tripped its own clone detection (supertokens-core#1195). Got: " +
                JSON.stringify(signInResponse)
        );
    });

    /**
     * CONTROL 1 — passes on current main.
     *
     * The exact same credential/assertion accepted via the recipe function,
     * which verifies only once. Proves the assertion and counter handling are
     * valid, isolating the API-layer double verification as the failure cause.
     */
    it("direct recipe signIn succeeds with the same counter-incrementing authenticator", async function () {
        const app = await initSTAndGetApp();
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator, { signCount: 1 });

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});

        const signInResult = await WebAuthn.signIn({
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            credential: authenticator.createAssertion(signInOptions, { signCount: 2, userHandle }),
            session: undefined,
            shouldTryLinkingWithSessionUser: false,
            tenantId: "public",
        });

        assert.strictEqual(signInResult.status, "OK", "Got: " + JSON.stringify(signInResult));
    });

    /**
     * CONTROL 2 — passes on current main.
     *
     * With signCount pinned to 0 (Apple/Google passkey behavior) the spec skips
     * the counter check entirely, so the double verification goes unnoticed.
     * This is why the bug was invisible in most manual testing.
     */
    it("sign-in API call succeeds when signCount stays 0 (why the bug is hidden)", async function () {
        const app = await initSTAndGetApp();
        const authenticator = createSoftAuthenticator({ rpId: RP_ID, origin: ORIGIN });
        const { userHandle } = await registerUser(app, authenticator, { signCount: 0 });

        const signInOptions = await post(app, "/auth/webauthn/options/signin", {});

        const signInResponse = await post(app, "/auth/webauthn/signin", {
            credential: authenticator.createAssertion(signInOptions, { signCount: 0, userHandle }),
            webauthnGeneratedOptionsId: signInOptions.webauthnGeneratedOptionsId,
            shouldTryLinkingWithSessionUser: false,
        });

        assert.strictEqual(signInResponse.status, "OK", "Got: " + JSON.stringify(signInResponse));
    });
});
