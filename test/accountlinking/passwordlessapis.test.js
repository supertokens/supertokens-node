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
    stopST,
    killAllST,
    cleanST,
    resetAll,
    extractInfoFromResponse,
} = require("../utils");
let supertokens = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/passwordlessapis.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createCodePOST tests", function () {
        it("calling createCodePOST fails if email exists in some non passwordless primary user - account linking enabled and email verification required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomTextMessage: (input) => {
                            return;
                        },
                        createAndSendCustomEmail: (input) => {
                            userInputCode = input.userInputCode;
                            return;
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const email = "test@example.com";
            let tpUser = await ThirdParty.signInUp("google", "abc", email, false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            // createCodeAPI with email
            let createCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert(createCodeResponse !== undefined);
            assert.deepStrictEqual(createCodeResponse, {
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot sign in / up due to security reasons. Please contact support.",
            });
        });

        it("calling createCodePOST succeeds, if email exists in some non passwordless, non primary user, verified account with account linking enabled, and email verification required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomTextMessage: (input) => {
                            return;
                        },
                        createAndSendCustomEmail: (input) => {
                            userInputCode = input.userInputCode;
                            return;
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const email = "test@example.com";
            let tpUser = await ThirdParty.signInUp("google", "abc", email, true, { doNotLink: true });

            // createCodeAPI with email
            let createCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.notEqual(createCodeResponse, undefined);
            assert.strictEqual(createCodeResponse.status, "SIGN_IN_UP_NOT_ALLOWED");
        });

        it("calling createCodePOST fails, if email exists in some non passwordless, non primary user, with account linking enabled, and email verification required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomTextMessage: (input) => {
                            return;
                        },
                        createAndSendCustomEmail: (input) => {
                            userInputCode = input.userInputCode;
                            return;
                        },
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const email = "test@example.com";
            let tpUser = await ThirdParty.signInUp("google", "abc", email, true, { doNotLink: true });

            // createCodeAPI with email
            let createCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: email,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert(createCodeResponse !== undefined);
            assert.deepStrictEqual(createCodeResponse, {
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot sign in / up due to security reasons. Please contact support.",
            });
        });
    });
});
