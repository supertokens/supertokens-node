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
const { printPath, startST, killAllST, setupST, cleanST } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { isFakeEmail } = require("../../lib/build/recipe/thirdparty/utils");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const fakeEmail = "12345.github@stfakeemail.supertokens.com";

describe(`fake emails: ${printPath("[test/emailpassword/fakeEmail.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("isFakeEmail", function () {
        for (const email of [
            fakeEmail,
            "12345.GITHUB@STFAKEEMAIL.SUPERTOKENS.COM",
            "12345.github@StFakeEmail.SuperTokens.com",
            ` ${fakeEmail} `,
            "user.github.fakeemail.com",
            "USER.GITHUB.FAKEEMAIL.COM",
        ]) {
            it(`returns true for ${JSON.stringify(email)}`, function () {
                assert.strictEqual(isFakeEmail(email), true);
            });
        }

        for (const email of ["user@example.com", "stfakeemail.supertokens.com@example.com"]) {
            it(`returns false for ${JSON.stringify(email)}`, function () {
                assert.strictEqual(isFakeEmail(email), false);
            });
        }
    });

    describe("emailpassword APIs", function () {
        beforeEach(async function () {
            ProcessState.getInstance().reset();
            const connectionURI = await startST();
            STExpress.init({
                supertokens: { connectionURI },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "header" })],
            });
        });

        function getApp() {
            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            return app;
        }

        function signIn(email, password) {
            return request(getApp())
                .post("/auth/signin")
                .send({
                    formFields: [
                        { id: "email", value: email },
                        { id: "password", value: password },
                    ],
                });
        }

        function signUp(email, password) {
            return request(getApp())
                .post("/auth/signup")
                .send({
                    formFields: [
                        { id: "email", value: email },
                        { id: "password", value: password },
                    ],
                });
        }

        for (const email of [fakeEmail, fakeEmail.toUpperCase(), "12345.GitHub@StFakeEmail.SuperTokens.com"]) {
            it(`does not sign in as a first factor with a password on a fake email using ${email}`, async function () {
                // e.g.: a password set up as a secondary factor for a third party user without an email
                const signUpRes = await EmailPassword.signUp("public", fakeEmail, "password123");
                assert.strictEqual(signUpRes.status, "OK");

                const res = await signIn(email, "password123");

                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.status, "WRONG_CREDENTIALS_ERROR");
                assert.strictEqual(res.headers["st-access-token"], undefined);
            });
        }

        it("rejects sign up with an upper-cased fake email domain the same way as the lowercase one", async function () {
            const lowercaseRes = await signUp("someone@stfakeemail.supertokens.com", "password123");
            const uppercaseRes = await signUp("someone@STFAKEEMAIL.SUPERTOKENS.COM", "password123");

            assert.strictEqual(lowercaseRes.status, 200);
            assert.strictEqual(lowercaseRes.body.status, "FIELD_ERROR");
            assert.deepStrictEqual(uppercaseRes.body, lowercaseRes.body);
            const users = await STExpress.listUsersByAccountInfo("public", {
                email: "someone@stfakeemail.supertokens.com",
            });
            assert.strictEqual(users.length, 0);
        });

        it("still signs in with a regular email", async function () {
            await EmailPassword.signUp("public", "user@example.com", "password123");

            const res = await signIn("USER@example.com", "password123");

            assert.strictEqual(res.body.status, "OK");
        });
    });
});
