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
    startSTWithMultitenancyAndAccountLinking,
    extractInfoFromResponse,
} = require("../utils");
let SuperTokens = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let EmailVerification = require("../../recipe/emailverification");
let AccountLinking = require("../../recipe/accountlinking");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let MultiTenancy = require("../../recipe/multitenancy");
const { getTestExpressApp, epSignIn, epSignUp, tpSignInUp } = require("../mfa/utils");

describe(`accountlinkingTests: ${printPath(
    "[test/accountlinking/overwriteSessionDuringSignIn.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("with active session and overwriteSessionDuringSignIn = false", function () {
        it("test that is SignUpAllowed is called with an active session", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init(),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            let res = await epSignUp(app, "test1@example.com", "password1");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            res = await epSignUp(app, "test2@example.com", "password2", accessToken);
            let state = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED);
            assert(state !== undefined);
        });

        it("test that isSignInAllowed is not called", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init(),
                    Session.init(),
                ],
            });

            await EmailPassword.signUp("public", "test2@example.com", "password2");

            const app = getTestExpressApp();

            let res = await epSignUp(app, "test1@example.com", "password1");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            res = await epSignIn(app, "test2@example.com", "password2", accessToken);
            let state = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED, 2000);
            assert(state === undefined);
        });

        it("test that insecure sign up is not allowed", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "custom",
                                        clients: [
                                            {
                                                clientId: "clientid1",
                                            },
                                        ],
                                    },
                                    override: (oI) => {
                                        oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                            return input.redirectURIInfo.redirectURIQueryParams;
                                        };
                                        oI.getUserInfo = async (input) => {
                                            return {
                                                thirdPartyUserId: input.oAuthTokens.email,
                                                email: {
                                                    id: input.oAuthTokens.email,
                                                    isVerified: true,
                                                },
                                            };
                                        };
                                        return oI;
                                    },
                                },
                            ],
                        },
                    }),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            let res = await tpSignInUp(app, "custom", "test1@example.com");
            assert.strictEqual(res.status, 200);

            res = await tpSignInUp(app, "custom", "test2@example.com");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            // sign up is not allowed here, as it may result in insecure account creation
            res = await epSignUp(app, "test1@example.com", "password2", accessToken);
            assert.strictEqual("SIGN_UP_NOT_ALLOWED", res.body.status);
        });

        it("test that account linking is not attempted with an insecure sign in", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "custom",
                                        clients: [
                                            {
                                                clientId: "clientid1",
                                            },
                                        ],
                                    },
                                    override: (oI) => {
                                        oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                            return input.redirectURIInfo.redirectURIQueryParams;
                                        };
                                        oI.getUserInfo = async (input) => {
                                            return {
                                                thirdPartyUserId: input.oAuthTokens.email,
                                                email: {
                                                    id: input.oAuthTokens.email,
                                                    isVerified: true,
                                                },
                                            };
                                        };
                                        return oI;
                                    },
                                },
                            ],
                        },
                    }),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            await EmailPassword.signUp("public", "test1@example.com", "password1", false);

            let res = await tpSignInUp(app, "custom", "test1@example.com");
            assert.strictEqual(res.status, 200);

            res = await tpSignInUp(app, "custom", "test2@example.com");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            // sign is allowed, but account linking should not be attempted
            res = await epSignIn(app, "test1@example.com", "password1", accessToken);
            assert.strictEqual("OK", res.body.status);
            assert.strictEqual(false, res.body.user.isPrimaryUser);

            let state = ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED, 1000);
            assert(state !== undefined);

            cookies = extractInfoFromResponse(res);
            assert.equal(undefined, cookies.accessTokenFromAny);
        });

        it("test that when sign up is allowed, account linking is not attempted", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "custom",
                                        clients: [
                                            {
                                                clientId: "clientid1",
                                            },
                                        ],
                                    },
                                    override: (oI) => {
                                        oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                            return input.redirectURIInfo.redirectURIQueryParams;
                                        };
                                        oI.getUserInfo = async (input) => {
                                            return {
                                                thirdPartyUserId: input.oAuthTokens.email,
                                                email: {
                                                    id: input.oAuthTokens.email,
                                                    isVerified: true,
                                                },
                                            };
                                        };
                                        return oI;
                                    },
                                },
                            ],
                        },
                    }),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            let user = await EmailPassword.signUp("public", "test1@example.com", "password1", false);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                user.recipeUserId,
                "test1@example.com"
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let res = await epSignUp(app, "test2@example.com", "password2");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            // sign is allowed, but account linking should not be attempted
            res = await tpSignInUp(app, "custom", "test1@example.com", accessToken);
            assert.strictEqual("OK", res.body.status);
            assert.strictEqual(false, res.body.user.isPrimaryUser);

            let state = ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED, 1000);
            assert(state !== undefined);

            cookies = extractInfoFromResponse(res);
            assert.equal(undefined, cookies.accessTokenFromAny);
        });
    });

    describe("with overwriteSessionDuringSignIn = true", function () {
        it("test that is SignUpAllowed is called with an active session", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init(),
                    Session.init({
                        overwriteSessionDuringSignIn: true,
                    }),
                ],
            });

            const app = getTestExpressApp();

            let res = await epSignUp(app, "test1@example.com", "password1");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            res = await epSignUp(app, "test2@example.com", "password2", accessToken);
            let state = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED);
            assert(state !== undefined);
        });

        it("test that isSignInAllowed is not called", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init(),
                    Session.init({
                        overwriteSessionDuringSignIn: true,
                    }),
                ],
            });

            await EmailPassword.signUp("public", "test2@example.com", "password2");

            const app = getTestExpressApp();

            let res = await epSignUp(app, "test1@example.com", "password1");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            res = await epSignIn(app, "test2@example.com", "password2", accessToken);
            let state = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED, 2000);
            assert(state !== undefined);
        });

        it("test that when sign up is allowed, account linking is attempted", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "custom",
                                        clients: [
                                            {
                                                clientId: "clientid1",
                                            },
                                        ],
                                    },
                                    override: (oI) => {
                                        oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                            return input.redirectURIInfo.redirectURIQueryParams;
                                        };
                                        oI.getUserInfo = async (input) => {
                                            return {
                                                thirdPartyUserId: input.oAuthTokens.email,
                                                email: {
                                                    id: input.oAuthTokens.email,
                                                    isVerified: true,
                                                },
                                            };
                                        };
                                        return oI;
                                    },
                                },
                            ],
                        },
                    }),
                    Session.init({
                        overwriteSessionDuringSignIn: true,
                    }),
                ],
            });

            const app = getTestExpressApp();

            let user = await EmailPassword.signUp("public", "test1@example.com", "password1", false);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                user.recipeUserId,
                "test1@example.com"
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let res = await epSignUp(app, "test2@example.com", "password2");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            // sign is allowed, and account linking should be attempted
            res = await tpSignInUp(app, "custom", "test1@example.com", accessToken);
            assert.strictEqual("OK", res.body.status);
            assert.strictEqual(true, res.body.user.isPrimaryUser);

            let state = ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_UP_ALLOWED_CALLED, 1000);
            assert(state !== undefined);

            cookies = extractInfoFromResponse(res);
            assert(undefined !== cookies.accessTokenFromAny);
        });

        it("test that account linking is attempted during sign in", async function () {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function () {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "custom",
                                        clients: [
                                            {
                                                clientId: "clientid1",
                                            },
                                        ],
                                    },
                                    override: (oI) => {
                                        oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                            return input.redirectURIInfo.redirectURIQueryParams;
                                        };
                                        oI.getUserInfo = async (input) => {
                                            return {
                                                thirdPartyUserId: input.oAuthTokens.email,
                                                email: {
                                                    id: input.oAuthTokens.email,
                                                    isVerified: true,
                                                },
                                            };
                                        };
                                        return oI;
                                    },
                                },
                            ],
                        },
                    }),
                    Session.init({
                        overwriteSessionDuringSignIn: true,
                    }),
                ],
            });

            const app = getTestExpressApp();

            await ThirdParty.manuallyCreateOrUpdateUser("public", "custom", "tenant1@example.com", "test1@example.com", true, false); // create a recipe user

            let user = await EmailPassword.signUp("public", "test1@example.com", "password1", false);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                user.recipeUserId,
                "test1@example.com"
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let res = await epSignUp(app, "test2@example.com", "password2");
            assert.strictEqual(res.status, 200);

            let cookies = extractInfoFromResponse(res);
            const accessToken = cookies.accessTokenFromAny;

            ProcessState.getInstance().reset();

            // sign is allowed, and account linking should be attempted
            res = await tpSignInUp(app, "custom", "test1@example.com", accessToken);
            assert.strictEqual("OK", res.body.status);
            assert.strictEqual(true, res.body.user.isPrimaryUser);

            let state = ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_ALLOWED_CALLED, 1000);
            assert(state !== undefined);

            cookies = extractInfoFromResponse(res);
            assert(undefined !== cookies.accessTokenFromAny);
        });


    });
});
