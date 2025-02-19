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

const STExpress = require("../..");
const WebAuthn = require("../../recipe/webauthn");
const WebAuthnRecipe = require("../../lib/build/recipe/webauthn/recipe").default;
const EmailPassword = require("../../recipe/emailpassword");
const AccountLinking = require("../../recipe/accountlinking");
const AccountLinkingRecipe = require("../../lib/build/recipe/accountlinking/recipe").default;
const Session = require("../../recipe/session");
const SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
const EmailVerification = require("../../recipe/emailverification");
const EmailVerificationRecipe = require("../../lib/build/recipe/emailverification/recipe").default;
const { ProcessState } = require("../../lib/build/processState");
const { middleware, errorHandler } = require("../../framework/express");
const { isCDIVersionCompatible } = require("../utils");
const createWebauthnUser = require("../webauthn/lib/createUser");

describe(`apiInterface: ${printPath("[test/emailverification/apiInterface.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("[verifyEmailPOST]", function () {
        it("should verify the user when user signed up with emailpassword recipe", async function () {
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
                recipeList: [Session.init(), EmailPassword.init(), EmailVerification.init({ mode: "REQUIRED" })],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            assert(await isCDIVersionCompatible("2.11"));

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            const signUpResult = await EmailPasswordRecipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
                email,
                password: "1234",
                tenantId: "public",
                userContext: {},
            });

            assert.equal(signUpResult.status, "OK");
            assert.equal(typeof signUpResult.user.id, "string");
            assert.equal(typeof signUpResult.recipeUserId.getAsString(), "string");

            const tokenResult = await EmailVerificationRecipe.getInstanceOrThrowError().recipeInterfaceImpl.createEmailVerificationToken(
                {
                    email,
                    recipeUserId: signUpResult.recipeUserId,
                    tenantId: "public",
                    userContext: {},
                }
            );

            assert.equal(tokenResult.status, "OK");
            assert.equal(typeof tokenResult.token, "string");

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const verifyResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .send({
                        token: tokenResult.token,
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

            assert.equal(verifyResponse.status, "OK");

            const user = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.getUser({
                userId: signUpResult.user.id,
                userContext: {},
            });

            assert(user?.loginMethods?.find((method) => method.recipeId === "emailpassword")?.verified);
        });

        it("should verify the user when user signed up with webauthn recipe", async function () {
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
                    AccountLinking.init(),
                    WebAuthn.init({
                        getOrigin: async () => {
                            return origin; // set it like this because the default value would actually use the origin and it would not match the default relying party id
                        },
                        getRelyingPartyId: async () => {
                            return rpId;
                        },
                        getRelyingPartyName: async () => {
                            return rpName;
                        },
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                ],
            });

            // run test if current CDI version >= 2.11
            // todo update this to crrect version
            assert(await isCDIVersionCompatible("2.11"));

            const { email, signUpResponse } = await createWebauthnUser(rpId, rpName, origin);

            assert.equal(signUpResponse.status, "OK");
            assert.equal(
                typeof signUpResponse.user?.loginMethods?.find((method) => method.recipeId === "webauthn")
                    ?.recipeUserId,
                "string"
            );
            const recipeUserId = STExpress.convertToRecipeUserId(
                signUpResponse.user?.loginMethods?.find((method) => method.recipeId === "webauthn")?.recipeUserId
            );

            const tokenResult = await EmailVerificationRecipe.getInstanceOrThrowError().recipeInterfaceImpl.createEmailVerificationToken(
                {
                    email,
                    recipeUserId,
                    tenantId: "public",
                    userContext: {},
                }
            );

            assert.equal(tokenResult.status, "OK");
            assert.equal(typeof tokenResult.token, "string");

            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            const verifyResponse = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/user/email/verify")
                    .send({
                        token: tokenResult.token,
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

            assert.equal(verifyResponse.status, "OK");

            const user = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.getUser({
                userId: signUpResponse.user.id,
                userContext: {},
            });

            assert(user?.loginMethods?.find((method) => method.recipeId === "webauthn")?.verified);
        });
    });
});
