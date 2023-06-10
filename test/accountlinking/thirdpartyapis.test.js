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
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let nock = require("nock");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/thirdpartyapis.test.js]")}`, function () {
    before(function () {
        this.customProviderWithEmailVerified = {
            id: "custom-ev",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
        this.customProviderWithEmailNotVerified = {
            id: "custom-no-ev",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
                    },
                };
            },
        };
    });
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("signInUpPOST tests", function () {
        it("signInUpPOST calls isSignUpAllowed if it's sign up even if user with email already exists with third party.", async function () {
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
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,
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

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (await ThirdParty.signInUp("google", "abc", "email@test.com", true)).user;
            assert(tpUser.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
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

            assert(response.body.status === "OK");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) !== undefined
            );
        });

        it("signInUpPOST does not call isSignUpAllowed if it's a sign in even if user's email has changed", async function () {
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
                    EmailPassword.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                this.customProviderWithEmailVerified,
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

            nock("https://test.com").post("/oauth/token").reply(200, {});

            let tpUser = (await ThirdParty.signInUp("custom-ev", "user", "email2@test.com", true)).user;
            assert(tpUser.isPrimaryUser === true);

            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup")
                    .send({
                        thirdPartyId: "custom-ev",
                        code: "abcdefghj",
                        redirectURI: "http://127.0.0.1/callback",
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

            assert(response.body.status === "OK");
            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED)) === undefined
            );
        });
    });
});
