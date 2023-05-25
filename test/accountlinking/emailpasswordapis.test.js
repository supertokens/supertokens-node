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

    describe("linkAccountWithUserFromSessionPOST tests", function () {
        it("calling linkAccountWithUserFromSessionPOST succeeds to link new account", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            assert(!res.body.wereAccountsAlreadyLinked);

            tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 2);
        });

        it("calling linkAccountWithUserFromSessionPOST succeeds to link existing account", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            await EmailPassword.signUp("test2@example.com", "password123", {
                doNotLink: true,
            });

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            assert(!res.body.wereAccountsAlreadyLinked);

            tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 2);
        });

        it("calling linkAccountWithUserFromSessionPOST succeeds to link existing account that was already linked", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let rUser = (
                await EmailPassword.signUp("test2@example.com", "password123", {
                    doNotLink: true,
                })
            ).user;

            await AccountLinking.linkAccounts(rUser.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
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
            assert(res !== undefined);
            assert(res.body.status === "OK");
            assert(res.body.wereAccountsAlreadyLinked);

            tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 2);
        });

        it("calling linkAccountWithUserFromSessionPOST fails to link existing account if wrong credentials given", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            await EmailPassword.signUp("test2@example.com", "password123", {
                doNotLink: true,
            });

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password",
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
            assert(res.body.status === "WRONG_CREDENTIALS_ERROR");
            assert(!res.body.wereAccountsAlreadyLinked);

            tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSessionPOST fails to link new account if password policy doesn't match", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                            {
                                id: "password",
                                value: "password",
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
                        error: "Password must contain at least one number",
                        id: "password",
                    },
                ],
            });

            tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny === undefined);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSessionPOST fails to link new account when email verification is required", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
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
            assert(res !== undefined);
            assert(res.body.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");

            tokens = extractInfoFromResponse(res);
            let newSession = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);
            let claimValue = await newSession.getClaimValue(AccountLinking.AccountLinkingClaim);
            let newUser = await supertokens.getUser(claimValue);
            assert(newUser.emails[0] === "test2@example.com");
            assert(newUser.emails.length === 1);

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSessionPOST fails to link new account when current user is not a primary user and its email is not verified", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
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
                    .expect(403)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(res !== undefined);
            assert.deepStrictEqual(JSON.parse(res.text), {
                message: "invalid claim",
                claimValidationErrors: [
                    { id: "st-ev", reason: { message: "wrong value", expectedValue: true, actualValue: false } },
                ],
            });

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);
        });

        it("calling linkAccountWithUserFromSessionPOST correctly sends ACCOUNT_LINKING_NOT_ALLOWED_ERROR ", async function () {
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
                    Session.init(),
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            // we create a primary user here so that the sign up below fails..
            await EmailPassword.signUp("test2@example.com", "password123");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/link-account")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
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
            assert(res !== undefined);
            assert(res.body.status === "ACCOUNT_LINKING_NOT_ALLOWED_ERROR");
            assert(res.body.description === "New user is already linked to another account or is a primary user.");

            let pUser = await supertokens.getUser(epUser.id);
            assert(pUser.loginMethods.length === 1);
        });
    });

    describe("emailExistsGET tests", function () {
        it("calling emailExistsGET returns true if email exists in some non email password primary user - account linking enabled and email verification required", async function () {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });

        it("calling emailExistsGET returns false if email exists in some non email password, non primary user - account linking enabled, and email verification required", async function () {
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

            await ThirdParty.signInUp("google", "abc", "test@example.com");

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(!res.body.exists);
        });

        it("calling emailExistsGET returns false if email exists in some non email password primary user - account linking enabled and email verification not required", async function () {
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
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(!res.body.exists);
        });

        it("calling emailExistsGET returns false if email exists in some non email password, non primary user - account linking enabled, and email verification not required", async function () {
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            await ThirdParty.signInUp("google", "abc", "test@example.com");

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(!res.body.exists);
        });

        it("calling emailExistsGET returns false if email exists in some non email password primary user - account linking disabled", async function () {
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
                                shouldAutomaticallyLink: false,
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
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(!res.body.exists);
        });

        it("calling emailExistsGET returns false if email exists in some non email password, non primary user - account linking disabled", async function () {
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            await ThirdParty.signInUp("google", "abc", "test@example.com");

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(!res.body.exists);
        });

        it("calling emailExistsGET returns true if email exists in email password primary user - account linking enabled and email verification required", async function () {
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });

        it("calling emailExistsGET returns true if email exists in email password user, non primary user - account linking enabled, and email verification required", async function () {
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
            assert(!epUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });

        it("calling emailExistsGET returns true if email exists in email password primary user - account linking enabled and email verification not required", async function () {
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });

        it("calling emailExistsGET returns true if email exists in email password, non primary user - account linking enabled, and email verification not required", async function () {
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123", {
                doNotLink: true,
            });
            assert(!epUser.user.isPrimaryUser);

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });

        it("calling emailExistsGET returns true if email exists in email password primary user - account linking disabled", async function () {
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(epUser.user.id));

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });

        it("calling emailExistsGET returns true if email exists in email password, non primary user - account linking disabled", async function () {
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
            assert(epUser.user.isPrimaryUser === false);

            let res = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists?email=test@example.com")
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
            assert(res.body.exists);
        });
    });

    describe("signUpPOST tests", function () {
        it("calling signUpPOST fails if email exists in some non email password primary user - account linking enabled and email verification required", async function () {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");
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
                status: "FIELD_ERROR",
                formFields: [
                    {
                        id: "email",
                        error: "This email already exists. Please sign in instead.",
                    },
                ],
            });
        });

        it("calling signUpPOST succeeds, but not linked account, if email exists in some non email password, non primary user - account linking enabled, and email verification required", async function () {
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

            let tpUser = await ThirdParty.signInUp("google", "abc", "test@example.com");

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
            assert(session.getUserId() !== session.getRecipeUserId());
        });

        it("calling signUpPOST succeeds, and linked account, if email exists in some non email password primary user - account linking enabled and email verification not required", async function () {
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
            assert(session.getUserId() !== session.getRecipeUserId());
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

        it("calling signUpPOST succeeds, and not linked account, but is a primary user, if email exists in some non email password, non primary user - account linking enabled, and email verification not required", async function () {
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            await ThirdParty.signInUp("google", "abc", "test@example.com");

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
            assert(epUser.loginMethods.length === 1);
        });

        it("calling signUpPOST succeeds if email exists in some non email password primary user - account linking disabled", async function () {
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
                                shouldAutomaticallyLink: false,
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
        });

        it("calling signUpPOST succeeds if email exists in some non email password, non primary user - account linking disabled", async function () {
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            await ThirdParty.signInUp("google", "abc", "test@example.com");

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
        });

        it("calling signUpPOST fails if email exists in email password primary user - account linking enabled and email verification required", async function () {
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
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

        it("calling signUpPOST false if email exists in email password user, non primary user - account linking enabled, and email verification required", async function () {
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
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

        it("calling signUpPOST fails if email exists in email password primary user - account linking enabled and email verification not required", async function () {
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
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
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

            let epUser = await EmailPassword.signUp("test@example.com", "password123", {
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
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
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let epUser = await EmailPassword.signUp("test@example.com", "password123");
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
        // TODO:..
    });
});
