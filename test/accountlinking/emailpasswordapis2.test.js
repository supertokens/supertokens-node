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
    startSTWithMultitenancyAndAccountLinking,
} = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/emailpasswordapis2.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("generatePasswordResetTokenPOST tests", function () {
        it("calling generatePasswordResetTokenPOST with no primary user and no email password user should be OK, and not send any email", async function () {
            let sendEmailCallbackCalled = false;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function () {
                                        sendEmailCallbackCalled = true;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailCallbackCalled === false);
        });

        it("calling generatePasswordResetTokenPOST with no primary user and existing email password user should be OK, and should send an email", async function () {
            let sendEmailToUserId = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                    },
                                };
                            },
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === epUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user, and email is in unverified state of primary user, and email verification is required, should return OK, but should not send an email", async function () {
            let sendEmailCallbackCalled = false;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function () {
                                        sendEmailCallbackCalled = true;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailCallbackCalled === false);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user, and email is in unverified state of primary user, and email verification is NOT required, should return OK, and should send an email", async function () {
            let sendEmailToUserId = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user, account linking enabled, and email verification required, should return OK, and should send an email", async function () {
            let sendEmailToUserId = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                    },
                                };
                            },
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user, account linking disabled, should return OK, but should not send an email", async function () {
            let sendEmailCallbackCalled = false;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function () {
                                        sendEmailCallbackCalled = true;
                                    },
                                };
                            },
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
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailCallbackCalled === false);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, where both accounts are linked, should send email if account linking is enabled", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, where both accounts are linked, should send email if account linking is disabled", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user existing, primary user is not verified, and email verification is required, should not send email", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2.body, {
                reason:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                status: "SIGN_UP_NOT_ALLOWED",
            });

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
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
            assert(sendEmailToUserEmail === undefined);
            assert(sendEmailToUserId === undefined);
        });

        it("calling generatePasswordResetTokenPOST with recipe user existing, and no email password user existing, primary user is not verified, and email verification is required, should not send email", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signup")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2.body, {
                reason:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                status: "SIGN_UP_NOT_ALLOWED",
            });

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
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
            assert(sendEmailToUserEmail === undefined);
            assert(sendEmailToUserId === undefined);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user existing, primary user is not verified, and email verification is not required, should send email", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
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
            assert(sendEmailToUserEmail === "test2@example.com");
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with recipe user existing, and no email password user existing, primary user is not verified, and email verification is not required, should not send email - cause no primary user exists", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false,
                undefined,
                {
                    doNotLink: true,
                }
            );
            assert(tpUser.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
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
            assert(sendEmailToUserEmail === undefined);
            assert(sendEmailToUserId === undefined);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, but account linking is disabled should send email, but for email password user", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToRecipeUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        sendEmailToRecipeUserId = input.user.recipeUserId;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToRecipeUserId.getAsString() === epUser.user.id);
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, account linking enabled, but email verification not required should send email, for primary user", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, account linking enabled, email verification required should send email, for primary user", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, with multiple login methods, and email is verified in one of those methods, and email password user existing, account linking enabled, email verification required should send email, for primary user", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
                        },
                    }),
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(tpUser.isPrimaryUser);

            let epUser2 = await EmailPassword.signUp("public", "test2@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser2.user.isPrimaryUser === false);
            await AccountLinking.linkAccounts(epUser2.user.loginMethods[0].recipeUserId, tpUser.id);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, with multiple login methods, and email right is not verified in the login methods, and email password user existing, account linking enabled, email verification required should say not allowed", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
                        },
                    }),
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser2 = await EmailPassword.signUp("public", "test2@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser2.user.isPrimaryUser === false);
            await AccountLinking.linkAccounts(epUser2.user.loginMethods[0].recipeUserId, tpUser.id);
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(epUser2.user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert.strictEqual(res.body.status, "PASSWORD_RESET_NOT_ALLOWED");
            assert.strictEqual(
                res.body.reason,
                "Reset password link was not created because of account take over risk. Please contact support. (ERR_CODE_001)"
            );
            assert.strictEqual(sendEmailToUserId, undefined);
            assert.strictEqual(sendEmailToUserEmail, undefined);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, with multiple login methods, and all of them having the same email, but none are verified, and email password user existing, account linking enabled, email verification required should send email with primary user", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                    EmailPassword.init({
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                    },
                                };
                            },
                        },
                    }),
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let tpUser2 = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );
            assert(tpUser2.user.isPrimaryUser === false);
            await AccountLinking.linkAccounts(supertokens.convertToRecipeUserId(tpUser2.user.id), tpUser.id);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);
            assert(sendEmailToUserEmail === "test@example.com");
        });
    });

    describe("passwordResetPOST tests", function () {
        it("calling passwordResetPOST with no primary user and existing email password user should change password and not link account, and not mark email as verified.", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === epUser.user.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert.strictEqual(emailPostPasswordReset, "test@example.com");
            assert(!userPostPasswordReset.isPrimaryUser);
            assert.strictEqual(userPostPasswordReset.loginMethods.length, 1);
            assert.strictEqual(userPostPasswordReset.id, epUser.user.id);
        });

        it("calling passwordResetPOST with bad password returns a PASSWORD_POLICY_VIOLATED_ERROR", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === epUser.user.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "valid",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        error: "Password must contain at least 8 characters, including a number",
                        id: "password",
                    },
                ],
            });
        });

        it("calling passwordResetPOST with primary user existing, and no email password user, and email is in unverified state of primary user, and email verification is NOT required, should create an email password user and link to the existing primary user.", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert(emailPostPasswordReset === "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert(userPostPasswordReset.loginMethods.length === 2);
            assert(userPostPasswordReset.id === tpUser.id);
            for (let i = 0; i < userPostPasswordReset.loginMethods.length; i++) {
                if (userPostPasswordReset.loginMethods[i].recipeUserId.getAsString() !== tpUser.id) {
                    assert(userPostPasswordReset.loginMethods[i].recipeId === "emailpassword");
                    assert(userPostPasswordReset.loginMethods[i].verified);
                } else {
                    assert(userPostPasswordReset.loginMethods[i].verified === false);
                }
                assert(userPostPasswordReset.loginMethods[i].email === "test@example.com");
            }
        });

        it("calling passwordResetPOST with primary user existing, and no email password user, and email is in unverified state of primary user, and email verification is NOT required, but right before the token is consumed, account linking is switched off, should only create an email password user and not link it, but very it.", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST({
                                            ...input,
                                            userContext: {
                                                ...input.userContext,
                                                doNotLink: true,
                                            },
                                        });
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert(emailPostPasswordReset === "test@example.com");
            assert(!userPostPasswordReset.isPrimaryUser);
            assert(userPostPasswordReset.loginMethods.length === 1);
            assert(userPostPasswordReset.id !== tpUser.id);
            for (let i = 0; i < userPostPasswordReset.loginMethods.length; i++) {
                assert(userPostPasswordReset.loginMethods[i].recipeId === "emailpassword");
                assert(userPostPasswordReset.loginMethods[i].verified);
                assert(userPostPasswordReset.loginMethods[i].email === "test@example.com");
            }
        });

        it("calling passwordResetPOST with primary user existing, and email password user existing (not linked), but the ep user was created after the reset password token was generated should result in an invalid token error, even though the token was consumed just fine.", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234", undefined, {
                doNotLink: true,
            });

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
            });
            let user = await supertokens.getUser(epUser.user.id);
            assert(user !== undefined);
            assert(user.id === epUser.user.id);
            assert(user.loginMethods.length === 1);
        });

        it("calling passwordResetPOST with primary user existing, and email password user existing (not linked), but the ep user was created and linked after the reset password token was generated should result in invalid token error", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert(epUser.user.isPrimaryUser === true);
            assert(epUser.user.id === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
            });
        });

        it("calling passwordResetPOST with primary user existing, and no email password user, and email is in unverified state of primary user, and email verification is required, should create an email password user and link to the existing primary user.", async function () {
            let sendEmailToUserId = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(tpUser.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserId === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert(emailPostPasswordReset === "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert(userPostPasswordReset.loginMethods.length === 2);
            assert(userPostPasswordReset.id === tpUser.id);
            for (let i = 0; i < userPostPasswordReset.loginMethods.length; i++) {
                if (userPostPasswordReset.loginMethods[i].recipeUserId.getAsString() !== tpUser.id) {
                    assert(userPostPasswordReset.loginMethods[i].recipeId === "emailpassword");
                }
                assert(userPostPasswordReset.loginMethods[i].verified);
                assert(userPostPasswordReset.loginMethods[i].email === "test@example.com");
            }
        });

        it("calling passwordResetPOST with primary user existing, and email password user existing, where both accounts are linked, should change existing email password account's password if account linking is enabled, and NOT mark both as verified", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert(emailPostPasswordReset === "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert(userPostPasswordReset.loginMethods.length === 2);
            assert(userPostPasswordReset.id === tpUser.id);
            for (let i = 0; i < userPostPasswordReset.loginMethods.length; i++) {
                if (userPostPasswordReset.loginMethods[i].recipeUserId.getAsString() !== tpUser.id) {
                    assert(userPostPasswordReset.loginMethods[i].recipeId === "emailpassword");
                    assert(userPostPasswordReset.loginMethods[i].email === "test@example.com");
                } else {
                    assert(userPostPasswordReset.loginMethods[i].email === "test2@example.com");
                }
                assert(!userPostPasswordReset.loginMethods[i].verified);
            }

            let signInResp = await EmailPassword.signIn("public", "test@example.com", "validpass123");
            assert(signInResp.status === "OK");
            assert(signInResp.user.id === tpUser.id);
        });

        it("calling passwordResetPOST with primary user existing, and email password user existing, where both accounts are linked, should change existing email password account's password if account linking is disabled, and NOT mark both as verified", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert(emailPostPasswordReset === "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert(userPostPasswordReset.loginMethods.length === 2);
            assert(userPostPasswordReset.id === tpUser.id);
            for (let i = 0; i < userPostPasswordReset.loginMethods.length; i++) {
                if (userPostPasswordReset.loginMethods[i].recipeUserId.getAsString() !== tpUser.id) {
                    assert(userPostPasswordReset.loginMethods[i].recipeId === "emailpassword");
                    assert(userPostPasswordReset.loginMethods[i].email === "test@example.com");
                } else {
                    assert(userPostPasswordReset.loginMethods[i].email === "test2@example.com");
                }
                assert(!userPostPasswordReset.loginMethods[i].verified);
            }

            let signInResp = await EmailPassword.signIn("public", "test@example.com", "validpass123");
            assert(signInResp.status === "OK");
            assert(signInResp.user.id === tpUser.id);
        });

        it("calling passwordResetPOST with primary user existing, and multiple email password user existing, where all accounts are linked, should change the right email password account's password, and NOT mark both as verified", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.id);

            let epUser2 = await EmailPassword.signUp("public", "test2@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser2.user.loginMethods[0].recipeUserId, tpUser.id);

            let pUser = await supertokens.getUser(epUser.user.id);
            assert(pUser.loginMethods.length === 3);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });
            assert(emailPostPasswordReset === "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert(userPostPasswordReset.loginMethods.length === 3);
            assert(userPostPasswordReset.id === tpUser.id);
            for (let i = 0; i < userPostPasswordReset.loginMethods.length; i++) {
                if (userPostPasswordReset.loginMethods[i].recipeUserId.getAsString() !== tpUser.id) {
                    assert(userPostPasswordReset.loginMethods[i].recipeId === "emailpassword");
                    assert(
                        userPostPasswordReset.loginMethods[i].email === "test@example.com" ||
                            userPostPasswordReset.loginMethods[i].email === "test2@example.com"
                    );
                } else {
                    assert(userPostPasswordReset.loginMethods[i].email === "test2@example.com");
                }
                assert(!userPostPasswordReset.loginMethods[i].verified);
            }

            {
                let signInResp = await EmailPassword.signIn("public", "test@example.com", "validpass123");
                assert(signInResp.status === "OK");
                assert(signInResp.user.id === tpUser.id);
            }
            {
                let signInResp = await EmailPassword.signIn("public", "test2@example.com", "password1234");
                assert(signInResp.status === "OK");
                assert(signInResp.user.id === tpUser.id);
            }
        });

        it("calling passwordResetPOST with primary user existing, and email password user existing, where both accounts are linked, when the token was created, but then get unlinked right before token consumption, should result in OK, but no linking done", async function () {
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
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

            let { user: tpUser } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test2@example.com",
                false
            );
            assert(tpUser.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.id));

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
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
            assert(sendEmailToUserEmail === "test@example.com");
            assert(sendEmailToUserId === tpUser.id);

            {
                await AccountLinking.unlinkAccount(epUser.user.loginMethods[0].recipeUserId);
                let user = await supertokens.getUser(tpUser.id);
                assert(user !== undefined);
                assert(user.loginMethods.length === 1);
            }

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            let user = await supertokens.getUser(tpUser.id);
            assert(user !== undefined);
            assert(user.loginMethods.length === 1);
            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });

            let signInResp = await EmailPassword.signIn("public", "test@example.com", "validpass123");
            assert(signInResp.status === "OK");
            assert(signInResp.user.id === epUser.user.id);
            assert(signInResp.user.loginMethods.length === 1);
            assert(signInResp.user.isPrimaryUser === false);
        });

        it("should create a linked user if a primary user exists with a verified and an unverified thirdparty sign in method with the same email", async function () {
            let date = Date.now();
            let email = `john.doe+${date}@supertokens.com`;
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let tpUser = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd" + date, email, true))
                .user;
            await AccountLinking.createPrimaryUser(tpUser.loginMethods[0].recipeUserId);

            let tpUserUnverified = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd2" + date, email, false)
            ).user;

            const linkRes = await AccountLinking.linkAccounts(tpUserUnverified.loginMethods[0].recipeUserId, tpUser.id);

            assert.strictEqual(linkRes.status, "OK");

            await EmailVerification.unverifyEmail(tpUserUnverified.loginMethods[0].recipeUserId);
            const primUser = await supertokens.getUser(linkRes.user.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: email,
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
            assert(sendEmailToUserEmail === email);
            assert(sendEmailToUserId === primUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            let user = await supertokens.getUser(tpUser.id);
            assert(user !== undefined);
            assert(user.loginMethods.length === 3);
            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });

            let signInResp = await EmailPassword.signIn("public", email, "validpass123");
            assert(signInResp.status === "OK");
            assert(signInResp.user.id === primUser.id);
            assert(signInResp.user.loginMethods.length === 3);
            assert(signInResp.user.isPrimaryUser === true);
        });

        it("should reset the password if a primary user exists with a verified emailpassword and an unverified thirdparty sign in method with the same email", async function () {
            let date = Date.now();
            let email = `john.doe+${date}@supertokens.com`;
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let epUser = (await EmailPassword.signUp("public", email, "differentvalidpass123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let evToken = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(epUser.id)
            );
            assert.strictEqual(evToken.status, "OK");
            await EmailVerification.verifyEmailUsingToken("public", evToken.token);

            let tpUserUnverified = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd2" + date, email, false)
            ).user;

            const linkRes = await AccountLinking.linkAccounts(tpUserUnverified.loginMethods[0].recipeUserId, epUser.id);

            assert.strictEqual(linkRes.status, "OK");

            await EmailVerification.unverifyEmail(tpUserUnverified.loginMethods[0].recipeUserId);
            const primUser = await supertokens.getUser(linkRes.user.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: email,
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
            assert(sendEmailToUserEmail === email);
            assert(sendEmailToUserId === primUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            let user = await supertokens.getUser(epUser.id);
            assert(user !== undefined);
            assert.strictEqual(user.loginMethods.length, 2);
            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });

            let signInResp = await EmailPassword.signIn("public", email, "validpass123");
            assert.strictEqual(signInResp.status, "OK");
            assert.strictEqual(signInResp.user.id, primUser.id);
            assert.strictEqual(signInResp.user.loginMethods.length, 2);
            assert.strictEqual(signInResp.user.isPrimaryUser, true);
        });

        it("should reset the password if a primary user exists with an unverified emailpassword and a verified thirdparty sign in method with the same email", async function () {
            let date = Date.now();
            let email = `john.doe+${date}@supertokens.com`;
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let epUser = (await EmailPassword.signUp("public", email, "differentvalidpass123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let tpUserUnverified = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd2" + date, email, true)
            ).user;

            const linkRes = await AccountLinking.linkAccounts(tpUserUnverified.loginMethods[0].recipeUserId, epUser.id);

            assert.strictEqual(linkRes.status, "OK");

            const primUser = await supertokens.getUser(linkRes.user.id);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: email,
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
            assert(sendEmailToUserEmail === email);
            assert(sendEmailToUserId === primUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            let user = await supertokens.getUser(epUser.id);
            assert(user !== undefined);
            assert.strictEqual(user.loginMethods.length, 2);
            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });

            let signInResp = await EmailPassword.signIn("public", email, "validpass123");
            assert.strictEqual(signInResp.status, "OK");
            assert.strictEqual(signInResp.user.id, primUser.id);
            assert.strictEqual(signInResp.user.loginMethods.length, 2);
            assert.strictEqual(signInResp.user.isPrimaryUser, true);
        });

        it("should create a linked user after password reset flow if the main user was deleted", async function () {
            let date = Date.now();
            let email = `john.doe+${date}@supertokens.com`;
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
            let token = undefined;
            let userPostPasswordReset = undefined;
            let emailPostPasswordReset = undefined;
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
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        let response = await oI.passwordResetPOST(input);
                                        if (response.status === "OK") {
                                            emailPostPasswordReset = response.email;
                                            userPostPasswordReset = response.user;
                                        }
                                        return response;
                                    },
                                };
                            },
                        },
                        emailDelivery: {
                            override: (oI) => {
                                return {
                                    ...oI,
                                    sendEmail: async function (input) {
                                        sendEmailToUserId = input.user.id;
                                        sendEmailToUserEmail = input.user.email;
                                        token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                    },
                                };
                            },
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
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

            let epUser = (await EmailPassword.signUp("public", email, "differentvalidpass123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let tpUser = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd2" + date, email, true))
                .user;

            const linkRes = await AccountLinking.linkAccounts(tpUser.loginMethods[0].recipeUserId, epUser.id);
            assert.strictEqual(linkRes.status, "OK");

            const deleteResp = await supertokens.deleteUser(epUser.id, false);
            assert.strictEqual(deleteResp.status, "OK");

            const primUser = await supertokens.getUser(linkRes.user.id);
            assert.strictEqual(primUser.id, epUser.id); // This should still be the id of the deleted ep user
            assert.strictEqual(primUser.loginMethods.length, 1);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset/token")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: email,
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
            assert(sendEmailToUserEmail === email);
            assert(sendEmailToUserId === primUser.id);

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/user/password/reset")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                        ],
                        token,
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

            let user = await supertokens.getUser(tpUser.id);
            assert(user !== undefined);
            assert(user.loginMethods.length === 2);
            assert(res2 !== undefined);
            assert.deepStrictEqual(res2, {
                status: "OK",
            });

            let signInResp = await EmailPassword.signIn("public", email, "validpass123");
            assert(signInResp.status === "OK");
            assert(signInResp.user.id === primUser.id);
            assert(signInResp.user.loginMethods.length === 2);
            assert(signInResp.user.isPrimaryUser === true);
        });
    });
});
