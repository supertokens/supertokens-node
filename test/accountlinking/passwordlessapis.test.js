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
    assertJSONEquals,
    startSTWithMultitenancyAndAccountLinking,
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

// phoneNumber based accounts can't exist in other recipes now,
const createCodeBehaviours = [
    // calling signUpPOST fails but not linked account, if email exists in some non email password, primary user, with account linking enabled, and email verification required
    // calling signUpPOST fails if email exists in some non email password primary user - account linking enabled and email verification
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: false, primary: true },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "SIGN_IN_UP_NOT_ALLOWED" },
    },
    // calling signUpPOST succeeds, but not linked account, if email exists in some non email password, non primary user, verified account with account linking enabled, and email verification required
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: true, primary: false },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK" },
    },
    // calling signUpPOST fails but not linked account, if email exists in some non email password, non primary user, with account linking enabled, and email verification required
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: false, primary: false },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "SIGN_IN_UP_NOT_ALLOWED" },
    },
    // calling signUpPOST succeeds, and linked account, if email exists in some non email password primary user - account linking enabled and email verification not required
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: false, primary: true },
        accountLinking: { enabled: true, requiresVerification: false },
        expect: { status: "OK" },
    },
    // calling signUpPOST succeeds, and not linked account, but is a primary user, if email exists in some non email password, non primary user - account linking enabled, and email verification not required
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: false, primary: false },
        accountLinking: { enabled: true, requiresVerification: false },
        expect: { status: "OK" },
    },
    // calling signUpPOST succeeds if email exists in some non email password primary user - account linking disabled
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: false, primary: true },
        accountLinking: { enabled: false },
        expect: { status: "OK" },
    },
    // calling signUpPOST succeeds if email exists in some non email password, non primary user - account linking disabled
    {
        // only: true,
        pwlessUser: undefined,
        otherRecipeUser: { verified: false, primary: false },
        accountLinking: { enabled: false },
        expect: { status: "OK" },
    },

    // calling signInPOST creates session with correct userId and recipeUserId in case accounts are linked
    {
        // only: true,
        pwlessUser: { exists: true, linked: true },
        otherRecipeUser: { verified: false, primary: true },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK" },
    },
    // calling signInPOST creates session with correct userId and recipeUserId in case accounts are not
    {
        // only: true,
        pwlessUser: { exists: true, linked: false },
        otherRecipeUser: { verified: true, primary: false },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK" },
    },

    // calling signInPOST calls isSignInAllowed and returns wrong credentials in case that function returns false
];

const consumeCodeBehaviours = [
    {
        pwlessUser: undefined,
        otherRecipeUser: { verified: true, primary: true },
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: false, userId: "self" },
    },
    {
        pwlessUser: undefined,
        otherRecipeUser: { verified: true, primary: false },
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: false, userId: "self" },
    },
    {
        pwlessUser: { exists: true, linked: true },
        otherRecipeUser: { verified: true, primary: true },
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: true, userId: "other" },
    },
    {
        pwlessUser: { exists: true, linked: false },
        otherRecipeUser: { verified: true, primary: false },
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: false, userId: "self" },
    },

    {
        pwlessUser: undefined,
        otherRecipeUser: { verified: true, primary: true },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "other" },
    },
    {
        pwlessUser: undefined,
        otherRecipeUser: { verified: true, primary: false },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "other" },
    },
    {
        pwlessUser: { exists: true, linked: false },
        otherRecipeUser: { verified: true, primary: false },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "other" },
    },
    {
        pwlessUser: { exists: true, linked: true },
        otherRecipeUser: { verified: true, primary: true },
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "other" },
    },

    {
        pwlessUser: undefined,
        otherRecipeUser: undefined,
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "self" },
    },
    {
        pwlessUser: { exists: true, linked: false },
        otherRecipeUser: undefined,
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "self" },
    },
    {
        pwlessUser: { exists: true, linked: true },
        otherRecipeUser: undefined,
        accountLinking: { enabled: true, requiresVerification: true },
        expect: { status: "OK", isPrimary: true, userId: "self" },
    },

    {
        pwlessUser: undefined,
        otherRecipeUser: undefined,
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: false, userId: "self" },
    },
    {
        pwlessUser: { exists: true, linked: false },
        otherRecipeUser: undefined,
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: false, userId: "self" },
    },
    {
        pwlessUser: { exists: true, linked: true },
        otherRecipeUser: undefined,
        accountLinking: { enabled: false },
        expect: { status: "OK", isPrimary: true, userId: "self" },
    },
];

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
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", email, false);
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
                reason:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
            });
        });

        it("calling createCodePOST succeeds, if email exists in some non passwordless, non primary user, verified account with account linking enabled, and email verification required", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                email,
                true,
                undefined,
                {
                    doNotLink: true,
                }
            );

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
            assert.strictEqual(createCodeResponse.status, "OK");
        });

        it("calling createCodePOST fails during sign up, if email exists in some non passwordless, non primary user, with account linking enabled, and email verification required", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", email, false);

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
                reason:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
            });
        });

        it("calling createCodePOST returns OK during sign in, if email exists in some non passwordless, non primary user, with account linking enabled, and email verification required", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
                        shouldDoAutomaticAccountLinking: async (_newAccountInfo, _user, _tenantId, userContext) => {
                            if (userContext?.doNotLink === true) {
                                return { shouldAutomaticallyLink: false };
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
            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abc", email, false);
            await Passwordless.signInUp({ email, tenantId: "public", userContext: { doNotLink: true } });

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
            assert.strictEqual(createCodeResponse.status, "OK");
        });

        describe("signup", () => {
            for (const b of createCodeBehaviours.filter((b) => b.pwlessUser === undefined)) {
                const otherUserSegment =
                    b.otherRecipeUser === undefined
                        ? "there is no other user with the same email"
                        : `a non-pwless ${b.otherRecipeUser.primary ? "primary" : "non-primary"} ${
                              b.otherRecipeUser.verified ? "verified" : "non-verified"
                          } user exists with the same email`;
                const accountLinkingSegment = `account linking ${
                    b.accountLinking.enabled ? "enabled" : "disabled"
                } and email verification ${b.accountLinking.requiresVerification ? "required" : "not-required"}`;
                it(`should return status: ${b.expect.status} if ${otherUserSegment} with ${accountLinkingSegment}`, () =>
                    getCreateCodeTestCase(b));
            }
        });

        describe("signin", () => {
            for (const b of createCodeBehaviours.filter((b) => b.pwlessUser !== undefined)) {
                const otherUserSegment =
                    b.otherRecipeUser === undefined
                        ? "there is no other user with the same email"
                        : `a non-pwless ${b.otherRecipeUser.primary ? "primary" : "non-primary"} ${
                              b.otherRecipeUser.verified ? "verified" : "non-verified"
                          } user exists with the same email`;
                const accountLinkingSegment = `account linking ${
                    b.accountLinking.enabled ? "enabled" : "disabled"
                } and email verification ${b.accountLinking.requiresVerification ? "required" : "not-required"}`;
                it(`should return status: ${b.expect.status} for a ${
                    b.pwlessUser.linked ? "primary" : "not-linked"
                } user if ${otherUserSegment} with ${accountLinkingSegment}`, () => getCreateCodeTestCase(b));
            }
        });
    });

    describe("consumeCodePOST tests", function () {
        describe("signup", () => {
            for (const b of consumeCodeBehaviours.filter((b) => b.pwlessUser === undefined)) {
                const otherUserSegment =
                    b.otherRecipeUser === undefined
                        ? "there is no other user with the same email"
                        : `a non-pwless ${b.otherRecipeUser.primary ? "primary" : "non-primary"} ${
                              b.otherRecipeUser.verified ? "verified" : "non-verified"
                          } user exists with the same email`;
                const accountLinkingSegment = `account linking ${
                    b.accountLinking.enabled ? "enabled" : "disabled"
                } and email verification ${b.accountLinking.requiresVerification ? "required" : "not-required"}`;
                it(`should return status: ${b.expect.status} if ${otherUserSegment} with ${accountLinkingSegment}`, () =>
                    getConsumeCodeTestCase(b));
            }
        });

        describe("signin", () => {
            for (const b of consumeCodeBehaviours.filter((b) => b.pwlessUser !== undefined)) {
                const otherUserSegment =
                    b.otherRecipeUser === undefined
                        ? "there is no other user with the same email"
                        : `a non-pwless ${b.otherRecipeUser.primary ? "primary" : "non-primary"} ${
                              b.otherRecipeUser.verified ? "verified" : "non-verified"
                          } user exists with the same email`;
                const accountLinkingSegment = `account linking ${
                    b.accountLinking.enabled ? "enabled" : "disabled"
                } and email verification ${b.accountLinking.requiresVerification ? "required" : "not-required"}`;
                it(`should return status: ${b.expect.status} for a ${
                    b.pwlessUser.linked ? "primary" : "not-linked"
                } user if ${otherUserSegment} with ${accountLinkingSegment}`, () => getConsumeCodeTestCase(b));
            }
        });

        describe("SIGN_IN_UP_NOT_ALLOWED", () => {
            it("should be returned if another (non-primary, unverified) user signs up after the code was created for a pwless sign up", async () => {
                const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
                        EmailVerification.init({
                            mode: "REQUIRED",
                        }),
                        AccountLinking.init({
                            shouldDoAutomaticAccountLinking: async (userInfo, __, _session, _tenantId, userContext) => {
                                if (userContext.doNotLink || userInfo.email?.includes("doNotLink") === true) {
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

                const email = `test-${Date.now()}@example.com`;

                let tpUser;

                const code = await Passwordless.createCode({ tenantId: "public", email });

                tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                    "public",
                    "google",
                    "abc" + Date.now(),
                    email,
                    false,
                    undefined,
                    {
                        doNotLink: true,
                    }
                );

                assert.strictEqual(tpUser.status, "OK");

                let consumeCodeResponse = await request(app).post("/auth/signinup/code/consume").send({
                    preAuthSessionId: code.preAuthSessionId,
                    deviceId: code.deviceId,
                    userInputCode: code.userInputCode,
                });

                assert.strictEqual(consumeCodeResponse.body.status, "SIGN_IN_UP_NOT_ALLOWED");
            });

            it("should be returned if another (primary, unverified) user signs up after the code was created for a pwless sign up", async () => {
                const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
                        EmailVerification.init({
                            mode: "REQUIRED",
                        }),
                        AccountLinking.init({
                            shouldDoAutomaticAccountLinking: async (userInfo, __, _session, _tenantId, userContext) => {
                                if (userContext.doNotLink || userInfo.email?.includes("doNotLink") === true) {
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

                const email = `test-${Date.now()}@example.com`;

                let tpUser;

                const code = await Passwordless.createCode({ tenantId: "public", email });

                tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                    "public",
                    "google",
                    "abc" + Date.now(),
                    email,
                    false,
                    undefined,
                    {
                        doNotLink: true,
                    }
                );

                assert.strictEqual(tpUser.status, "OK");
                const resp = await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));
                assert.strictEqual(resp.status, "OK");

                let consumeCodeResponse = await request(app).post("/auth/signinup/code/consume").send({
                    preAuthSessionId: code.preAuthSessionId,
                    deviceId: code.deviceId,
                    userInputCode: code.userInputCode,
                });

                assert.strictEqual(consumeCodeResponse.body.status, "SIGN_IN_UP_NOT_ALLOWED");
            });
        });
    });
});

/*
    Setup emails:
        tp-nonprimary-verified@example.com
        tp-nonprimary-unverified@example.com
        tp-primary-verified@example.com
*/

async function getCreateCodeTestCase({ pwlessUser, otherRecipeUser, accountLinking, expect }) {
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
            EmailVerification.init({
                mode: "REQUIRED",
            }),
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: async (userInfo, __, _session, _tenantId, userContext) => {
                    if (userContext.doNotLink || userInfo.email?.includes("doNotLink") === true) {
                        return {
                            shouldAutomaticallyLink: false,
                        };
                    }
                    return {
                        shouldAutomaticallyLink: accountLinking.enabled,
                        shouldRequireVerification: accountLinking.requiresVerification,
                    };
                },
            }),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    const email = "test@example.com";

    let tpUser;
    if (otherRecipeUser) {
        tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "google",
            "abc",
            email,
            otherRecipeUser.verified,
            undefined,
            {
                doNotLink: !otherRecipeUser.primary,
            }
        );

        assert.strictEqual(tpUser.status, "OK");
        if (otherRecipeUser.primary) {
            const resp = await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));
            assert.strictEqual(resp.status, "OK");
        }
    }

    if (pwlessUser?.exists === true) {
        const code = await Passwordless.createCode({ tenantId: "public", email });
        assert.strictEqual(code.status, "OK");
        const consumeResp = await Passwordless.consumeCode(
            {
                tenantId: "public",
                preAuthSessionId: code.preAuthSessionId,
                deviceId: code.deviceId,
                userInputCode: code.userInputCode,
            },
            {
                doNotLink: pwlessUser.linked !== true,
            }
        );
        assert.strictEqual(consumeResp.status, "OK");
        if (pwlessUser.linked === true) {
            const linkResp = await AccountLinking.linkAccounts(
                consumeResp.user.loginMethods[0].recipeUserId,
                tpUser.user.id
            );
            assert.strictEqual(linkResp.status, "OK");
        }
    }

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
    assert.strictEqual(createCodeResponse.status, expect.status);
}

async function getConsumeCodeTestCase({ pwlessUser, otherRecipeUser, accountLinking, expect }) {
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
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
            EmailVerification.init({
                mode: "REQUIRED",
            }),
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: async (userInfo, __, _session, _tenantId, userContext) => {
                    if (userContext.doNotLink || userInfo.email?.includes("doNotLink") === true) {
                        return {
                            shouldAutomaticallyLink: false,
                        };
                    }
                    return {
                        shouldAutomaticallyLink: accountLinking.enabled,
                        shouldRequireVerification: accountLinking.requiresVerification,
                    };
                },
            }),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    const email = `test-${Date.now()}@example.com`;

    let tpUser;
    if (otherRecipeUser) {
        tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "google",
            "abc" + Date.now(),
            email,
            otherRecipeUser.verified,
            undefined,
            {
                doNotLink: !otherRecipeUser.primary,
            }
        );

        assert.strictEqual(tpUser.status, "OK");
        if (otherRecipeUser.primary) {
            const resp = await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));
            assert.strictEqual(resp.status, "OK");
        }
    }

    if (pwlessUser?.exists === true) {
        const code = await Passwordless.createCode({ tenantId: "public", email });
        assert.strictEqual(code.status, "OK");
        const consumeResp = await Passwordless.consumeCode(
            {
                tenantId: "public",
                preAuthSessionId: code.preAuthSessionId,
                deviceId: code.deviceId,
                userInputCode: code.userInputCode,
            },
            {
                doNotLink: pwlessUser.linked !== true,
            }
        );
        assert.strictEqual(consumeResp.status, "OK");
        if (pwlessUser.linked === true) {
            if (tpUser) {
                const linkResp = await AccountLinking.linkAccounts(
                    consumeResp.user.loginMethods[0].recipeUserId,
                    tpUser.user.id
                );
                assert.strictEqual(linkResp.status, "OK");
            } else {
                const primResp = await AccountLinking.createPrimaryUser(consumeResp.user.loginMethods[0].recipeUserId);
                assert.strictEqual(primResp.status, "OK");
            }
        }
    }

    const code = await Passwordless.createCode({ tenantId: "public", email });

    let consumeCodeResponse = await request(app).post("/auth/signinup/code/consume").send({
        preAuthSessionId: code.preAuthSessionId,
        deviceId: code.deviceId,
        userInputCode: code.userInputCode,
    });

    assert.strictEqual(consumeCodeResponse.body.status, expect.status);
    if (expect.status === "OK") {
        const user = consumeCodeResponse.body.user;
        const userFromGetUser = await supertokens.getUser(user.id);

        assertJSONEquals(user, userFromGetUser.toJson());
        assert.strictEqual(user.isPrimaryUser, expect.isPrimary);
        if (expect.userId === "other") {
            assert.strictEqual(user.id, tpUser.user.id);
        } else if (tpUser !== undefined) {
            assert.notStrictEqual(user.id, tpUser.user.id);
        }
    }
}
