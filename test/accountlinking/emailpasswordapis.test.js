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

describe(`accountlinkingTests: ${printPath("[test/accountlinking/emailpasswordapis.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("signUpPOST tests", function () {
        it("calling signUpPOST returns email already exists if an EP user exsits with the same email even with account linking turned on", async function () {
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
                    EmailPassword.init(),
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

            let tpUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            const responseInfo = res.body;

            assert(responseInfo.status === "FIELD_ERROR");
            assert(responseInfo.formFields.length === 1);
            assert(responseInfo.formFields[0].id === "email");
            assert(responseInfo.formFields[0].error === "This email already exists. Please sign in instead.");
        });

        it("calling signUpPOST fails if email exists in some non email password primary user - account linking enabled and email verification required", async function () {
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
                    EmailPassword.init(),
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                reason:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                status: "SIGN_UP_NOT_ALLOWED",
            });
        });

        it("calling signUpPOST succeeds, but not linked account, if email exists in some non email password, non primary user, verified account with account linking enabled, and email verification required", async function () {
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
                    EmailPassword.init(),
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true,
                undefined,
                {
                    doNotLink: true,
                }
            );
            assert(tpUser.user.isPrimaryUser === false);
            assert(tpUser.user.loginMethods[0].verified === true);

            let res = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUser = await supertokens.getUser(res.body.user.id);
            assert(epUser.isPrimaryUser === false);
            assert(epUser.loginMethods.length === 1);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert(session.getUserId() !== tpUser.user.id);
            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("calling signUpPOST fails but not linked account, if email exists in some non email password, non primary user, with account linking enabled, and email verification required", async function () {
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
                    EmailPassword.init(),
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(!tpUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                reason:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                status: "SIGN_UP_NOT_ALLOWED",
            });
        });

        it("calling signUpPOST fails but not linked account, if email exists in some non email password, primary user, with account linking enabled, and email verification required", async function () {
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
                    EmailPassword.init(),
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(tpUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                reason:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                status: "SIGN_UP_NOT_ALLOWED",
            });
        });

        it("calling signUpPOST succeeds, and linked account, if email exists in some non email password primary user - account linking enabled and email verification not required", async function () {
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
                    EmailPassword.init(),
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUser = await supertokens.getUser(res.body.user.id);
            assert(epUser.isPrimaryUser === true);
            assert(epUser.loginMethods.length === 2);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert.notStrictEqual(session.getUserId(), session.getRecipeUserId().getAsString());
            assert.strictEqual(session.getUserId(), tpUser.user.id);
            let didAsserts = false;
            for (let i = 0; i < epUser.loginMethods.length; i++) {
                if (epUser.loginMethods[i].recipeId === "emailpassword") {
                    didAsserts = true;
                    assert(
                        epUser.loginMethods[i].recipeUserId.getAsString() === session.getRecipeUserId().getAsString()
                    );
                    assert(epUser.loginMethods[i].email === "test@example.com");
                }
            }
            assert(didAsserts);
        });

        it("calling signUpPOST succeeds, and links to older account, if email exists in some non email password, non primary user - account linking enabled, and email verification not required", async function () {
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
                    EmailPassword.init(),
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false,
                undefined,
                {
                    doNotLink: true,
                }
            );
            assert(tpUser.user.isPrimaryUser === false);
            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUser = await supertokens.getUser(res.body.user.id);
            assert(epUser.isPrimaryUser === true);
            assert(epUser.loginMethods.length === 2);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert(session.getUserId() === tpUser.user.id);
            assert(
                epUser.loginMethods.find((lm) => lm.recipeId === "emailpassword").recipeUserId.getAsString() ===
                    session.getRecipeUserId().getAsString()
            );
        });

        it("calling signUpPOST succeeds if email exists in some non email password primary user - account linking disabled", async function () {
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
                    EmailPassword.init(),
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUser = await supertokens.getUser(res.body.user.id);
            assert(epUser.isPrimaryUser === false);
            assert(epUser.loginMethods.length === 1);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert(session.getUserId() !== tpUser.user.id);
            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("calling signUpPOST succeeds if email exists in some non email password, non primary user - account linking disabled", async function () {
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
                    EmailPassword.init(),
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUser = await supertokens.getUser(res.body.user.id);
            assert(epUser.isPrimaryUser === false);
            assert(epUser.loginMethods.length === 1);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert(session.getUserId() !== tpUser.user.id);
            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("calling signUpPOST fails if email exists in email password primary user - account linking enabled and email verification required", async function () {
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
                    EmailPassword.init(),
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            const responseInfo = res.body;

            assert(responseInfo.status === "FIELD_ERROR");
            assert(responseInfo.formFields.length === 1);
            assert(responseInfo.formFields[0].id === "email");
            assert(responseInfo.formFields[0].error === "This email already exists. Please sign in instead.");
        });

        it("calling signUpPOST fails if email exists in email password user, non primary user - account linking enabled, and email verification required", async function () {
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
                    EmailPassword.init(),
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            assert(!epUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            const responseInfo = res.body;

            assert(responseInfo.status === "FIELD_ERROR");
            assert(responseInfo.formFields.length === 1);
            assert(responseInfo.formFields[0].id === "email");
            assert(responseInfo.formFields[0].error === "This email already exists. Please sign in instead.");
        });

        it("calling signUpPOST fails if email exists in email password primary user - account linking enabled and email verification not required", async function () {
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
                    EmailPassword.init(),
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
            });
        });

        it("calling signUpPOST fails if email exists in email password, non primary user - account linking enabled, and email verification not required", async function () {
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
                    EmailPassword.init(),
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123", undefined, {
                doNotLink: true,
            });
            assert(!epUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
            });
        });

        it("calling signUpPOST fails if email exists in email password primary user - account linking disabled", async function () {
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
                    EmailPassword.init(),
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
            });
        });

        it("calling signUpPOST fails if email exists in email password, non primary user - account linking disabled", async function () {
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
                    EmailPassword.init(),
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password123",
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
            assert(res !== undefined);
            assert.deepStrictEqual(res.body, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
            });
        });
    });

    describe("signInPOST tests", function () {
        it("calling signInPOST creates session with correct userId and recipeUserId in case accounts are linked", async function () {
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
                    EmailPassword.init(),
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.user.id);

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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUserFromResponse = await supertokens.getUser(res.body.user.id);
            assert(epUserFromResponse.isPrimaryUser === true);
            assert(epUserFromResponse.loginMethods.length === 2);
            assert(epUserFromResponse.id === tpUser.user.id);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert(session.getUserId() === tpUser.user.id);
            assert(session.getRecipeUserId().getAsString() === epUser.user.id);
        });

        it("calling signInPOST creates session with correct userId and recipeUserId in case accounts are not linked", async function () {
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
                    EmailPassword.init(),
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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
                            if (userContext.doLink) {
                                return {
                                    shouldAutomaticallyLink: true,
                                    shouldRequireVerification: true,
                                };
                            }
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false,
                undefined,
                {
                    doLink: true,
                }
            );
            assert(!tpUser.user.isPrimaryUser);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doLink: true,
            });

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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            let epUserFromResponse = await supertokens.getUser(res.body.user.id);
            assert(epUserFromResponse.isPrimaryUser === false);
            assert(epUserFromResponse.loginMethods.length === 1);
            assert(epUserFromResponse.id === epUser.user.id);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert(session.getUserId() === epUser.user.id);
            assert(session.getRecipeUserId().getAsString() === epUser.user.id);
        });

        it("calling signInPOST calls isSignInAllowed and returns SIGN_IN_NOT_ALLOWED in case that function returns false.", async function () {
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
                    EmailPassword.init(),
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });

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
            assert(res !== undefined);
            assert(res.body.status === "SIGN_IN_NOT_ALLOWED");

            let sessionTokens = extractInfoFromResponse(res);
            assert(sessionTokens.accessTokenFromAny === undefined);

            assert(
                (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.IS_SIGN_IN_UP_ALLOWED_HELPER_CALLED)) !==
                    undefined
            );
        });

        it("calling signInPOST links account if needed", async function () {
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
                    EmailPassword.init(),
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(tpUser.user.isPrimaryUser);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert(epUser.user.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.user.loginMethods[0].recipeUserId
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

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
            assert.strictEqual(res.body.status, "OK");
            let epUserFromResponse = await supertokens.getUser(res.body.user.id);
            assert.strictEqual(epUserFromResponse.isPrimaryUser, true);
            assert.strictEqual(epUserFromResponse.loginMethods.length, 2);
            assert.strictEqual(epUserFromResponse.id, tpUser.user.id);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert.strictEqual(session.getUserId(), tpUser.user.id);
            assert.strictEqual(session.getRecipeUserId().getAsString(), epUser.user.id);
        });

        it("calling signInPOST allows sign-in with a fresh user", async function () {
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
                    EmailPassword.init(),
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert(epUser.user.isPrimaryUser === false);

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
            assert.strictEqual(res.body.status, "OK");
            let epUserFromResponse = await supertokens.getUser(res.body.user.id);
            assert.strictEqual(epUserFromResponse.isPrimaryUser, false);
            assert.strictEqual(epUserFromResponse.loginMethods.length, 1);
            assert.strictEqual(epUserFromResponse.id, epUser.user.id);

            let sessionTokens = extractInfoFromResponse(res);
            let session = await Session.getSessionWithoutRequestResponse(sessionTokens.accessTokenFromAny);
            assert.strictEqual(session.getUserId(), epUser.user.id);
            assert.strictEqual(session.getRecipeUserId().getAsString(), epUser.user.id);
        });
    });
});
