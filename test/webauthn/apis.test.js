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
const {
    printPath,
    setupST,
    startST,
    startSTWithMultitenancy,
    killAllST,
    cleanST,
    setKeyValueInConfig,
    stopST,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let WebAuthn = require("../../recipe/webauthn");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
const { default: RecipeUserId } = require("../../lib/build/recipeUserId");

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

    it("test registerOptionsAPI with default values", async function () {
        const connectionURI = await startST();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokensplm",
                websiteDomain: "supertokens.io",
            },
            recipeList: [WebAuthn.init()],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) return;

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        // passing valid field
        let validCreateCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/webauthn/options/register")
                .send({
                    email: "test@example.com",
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        console.log(err);
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );
        console.log(validCreateCodeResponse);

        assert(validCreateCodeResponse.status === "OK");

        assert(typeof validCreateCodeResponse.challenge === "string");
        assert(validCreateCodeResponse.attestation === "none");
        assert(validCreateCodeResponse.rp.id === "supertokens.io");
        assert(validCreateCodeResponse.rp.name === "SuperTokensplm");
        assert(validCreateCodeResponse.user.name === "test@example.com");
        assert(validCreateCodeResponse.user.displayName === "test@example.com");
        assert(Number.isInteger(validCreateCodeResponse.timeout));
        assert(validCreateCodeResponse.authenticatorSelection.userVerification === "preferred");
        assert(validCreateCodeResponse.authenticatorSelection.requireResidentKey === true);
        assert(validCreateCodeResponse.authenticatorSelection.residentKey === "required");
    });
});

function checkConsumeResponse(validUserInputCodeResponse, { email, phoneNumber, isNew, isPrimary }) {
    assert.strictEqual(validUserInputCodeResponse.status, "OK");
    assert.strictEqual(validUserInputCodeResponse.createdNewRecipeUser, isNew);

    assert.strictEqual(typeof validUserInputCodeResponse.user.id, "string");
    assert.strictEqual(typeof validUserInputCodeResponse.user.timeJoined, "number");
    assert.strictEqual(validUserInputCodeResponse.user.isPrimaryUser, isPrimary);

    assert(validUserInputCodeResponse.user.emails instanceof Array);
    if (email !== undefined) {
        assert.strictEqual(validUserInputCodeResponse.user.emails.length, 1);
        assert.strictEqual(validUserInputCodeResponse.user.emails[0], email);
    } else {
        assert.strictEqual(validUserInputCodeResponse.user.emails.length, 0);
    }

    assert(validUserInputCodeResponse.user.phoneNumbers instanceof Array);
    if (phoneNumber !== undefined) {
        assert.strictEqual(validUserInputCodeResponse.user.phoneNumbers.length, 1);
        assert.strictEqual(validUserInputCodeResponse.user.phoneNumbers[0], phoneNumber);
    } else {
        assert.strictEqual(validUserInputCodeResponse.user.phoneNumbers.length, 0);
    }

    assert.strictEqual(validUserInputCodeResponse.user.thirdParty.length, 0);

    assert.strictEqual(validUserInputCodeResponse.user.loginMethods.length, 1);
    const loginMethod = {
        recipeId: "passwordless",
        recipeUserId: validUserInputCodeResponse.user.id,
        timeJoined: validUserInputCodeResponse.user.timeJoined,
        verified: true,
        tenantIds: ["public"],
    };
    if (email) {
        loginMethod.email = email;
    }
    if (phoneNumber) {
        loginMethod.phoneNumber = phoneNumber;
    }
    assert.deepStrictEqual(validUserInputCodeResponse.user.loginMethods, [loginMethod]);

    assert.strictEqual(Object.keys(validUserInputCodeResponse.user).length, 8);
    assert.strictEqual(Object.keys(validUserInputCodeResponse).length, 3);
}
