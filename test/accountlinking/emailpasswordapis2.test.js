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
            await startST();
            let sendEmailCallbackCalled = false;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");

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
            await startST();
            let sendEmailToUserId = undefined;
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

            let epUser = await EmailPassword.signUp("test@example.com", "password1234");

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
            await startST();
            let sendEmailCallbackCalled = false;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

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
            await startST();
            let sendEmailToUserId = undefined;
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user, account linking enabled, and email verification required, should return OK, and should send an email", async function () {
            await startST();
            let sendEmailToUserId = undefined;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));
            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(tpUser.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token);

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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user, account linking disabled, should return OK, but should not send an email", async function () {
            await startST();
            let sendEmailCallbackCalled = false;
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

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
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test2@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.user.id);

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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, where both accounts are linked, should send email if account linking is disabled", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test2@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("test@example.com", "password1234");
            await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, tpUser.user.id);

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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user existing, primary user is not verified, and email verification is required, should not send email", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test2@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

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
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
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
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test2@example.com");

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
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
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

        it("calling generatePasswordResetTokenPOST with primary user existing, and no email password user existing, primary user is not verified, and email verification is required, should not send email", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test2@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with recipe user existing, and no email password user existing, primary user is not verified, and email verification is not required, should not send email - cause no primary user exists", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.signInUp("google", "abc", "test2@example.com", {
                doNotLink: true,
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

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, but account linking is disabled should send email, but for email password user", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("test@example.com", "password1234", {
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
            assert(sendEmailToUserId === epUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, account linking enabled, but email verification not required should send email, for primary user", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("test@example.com", "password1234", {
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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, and email password user existing, account linking enabled, email verification required should send email, for primary user", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = await EmailPassword.signUp("test@example.com", "password1234", {
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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, with multiple login methods, and email is verified in one of those methods, and email password user existing, account linking enabled, email verification required should send email, for primary user", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(tpUser.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token);

            let epUser2 = await EmailPassword.signUp("test2@example.com", "password1234", {
                doNotLink: true,
            });
            assert(epUser2.user.isPrimaryUser === false);
            await AccountLinking.linkAccounts(epUser2.user.loginMethods[0].recipeUserId, tpUser.user.id);

            let epUser = await EmailPassword.signUp("test@example.com", "password1234", {
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
            assert(sendEmailToUserId === tpUser.user.id);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, with multiple login methods, and email right is not verified in the login methods, and email password user existing, account linking enabled, email verification required should say not allowed", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser2 = await EmailPassword.signUp("test2@example.com", "password1234", {
                doNotLink: true,
            });
            assert(epUser2.user.isPrimaryUser === false);
            await AccountLinking.linkAccounts(epUser2.user.loginMethods[0].recipeUserId, tpUser.user.id);
            let token = await EmailVerification.createEmailVerificationToken(
                supertokens.convertToRecipeUserId(epUser2.user.id)
            );
            await EmailVerification.verifyEmailUsingToken(token.token);

            let epUser = await EmailPassword.signUp("test@example.com", "password1234", {
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
            assert(res.body.status === "PASSWORD_RESET_NOT_ALLOWED");
            assert(
                res.body.reason ===
                    "Token generation was not done because of account take over risk. Please contact support."
            );
            assert(sendEmailToUserId === undefined);
            assert(sendEmailToUserEmail === undefined);
        });

        it("calling generatePasswordResetTokenPOST with primary user existing, with multiple login methods, and all of them having the same email, but none are verified, and email password user existing, account linking enabled, email verification required should send email with primary user", async function () {
            await startST();
            let sendEmailToUserId = undefined;
            let sendEmailToUserEmail = undefined;
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let tpUser2 = await ThirdParty.signInUp("google", "abcd", "test@example.com");
            await AccountLinking.linkAccounts(supertokens.convertToRecipeUserId(tpUser2.user.id), tpUser.user.id);

            let epUser = await EmailPassword.signUp("test@example.com", "password1234", {
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
            assert(sendEmailToUserId === tpUser.user.id);
            assert(sendEmailToUserEmail === "test@example.com");
        });
    });
});
