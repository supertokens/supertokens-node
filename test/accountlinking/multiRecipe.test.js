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
    killAllST,
    cleanST,
    extractInfoFromResponse,
    startSTWithMultitenancyAndAccountLinking,
} = require("../utils");
let supertokens = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let Passwordless = require("../../recipe/passwordless");
let EmailVerification = require("../../recipe/emailverification");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/multiRecipe.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("migration tests", function () {
        it("allows sign in with verified recipe user even if there is an unverified one w/ the same email", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            const shouldDoLinking = {
                shouldAutomaticallyLink: true,
                shouldRequireVerification: true,
            };
            const app = initST(connectionURI, shouldDoLinking);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert.strictEqual(epUser.user.isPrimaryUser, false);

            let pwlessUser = await Passwordless.signInUp({
                tenantId: "public",
                email: "test@example.com",
                userContext: { doNotLink: true },
            });
            assert.strictEqual(pwlessUser.user.isPrimaryUser, false);

            const code = await Passwordless.createCode({ tenantId: "public", email: "test@example.com" });

            let consumeCodeResponse = await request(app).post("/auth/signinup/code/consume").send({
                preAuthSessionId: code.preAuthSessionId,
                deviceId: code.deviceId,
                userInputCode: code.userInputCode,
            });

            assert.strictEqual(consumeCodeResponse.body.status, "OK");
        });

        it("should not allow sign in with unverified recipe user when there is a verified one w/ the same email", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            const shouldDoLinking = {
                shouldAutomaticallyLink: true,
                shouldRequireVerification: true,
            };
            const app = initST(connectionURI, shouldDoLinking);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert.strictEqual(epUser.user.isPrimaryUser, false);

            let pwlessUser = await Passwordless.signInUp({
                tenantId: "public",
                email: "test@example.com",
                userContext: { doNotLink: true },
            });
            assert.strictEqual(pwlessUser.user.isPrimaryUser, false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password1234",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.notStrictEqual(res, undefined);
            assert.strictEqual(res.body.status, "SIGN_IN_NOT_ALLOWED");
        });
    });
});

function initST(connectionURI, shouldDoLinking) {
    supertokens.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),
            Session.init(),
            EmailVerification.init({
                mode: "OPTIONAL",
            }),
            Passwordless.init({
                contactMethod: "EMAIL_OR_PHONE",
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
            }),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [
                                    {
                                        clientId: "",
                                        clientSecret: "",
                                    },
                                ],
                            },
                        },
                    ],
                },
            }),
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: async (_, __, _session, _tenantId, userContext) => {
                    if (userContext.doNotLink) {
                        return {
                            shouldAutomaticallyLink: false,
                        };
                    }
                    return shouldDoLinking;
                },
            }),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    return app;
}
