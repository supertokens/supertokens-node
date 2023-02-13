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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse, delay } = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const EmailVerification = require("../../recipe/emailverification");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let { SMTPService } = require("../../recipe/thirdpartyemailpassword/emaildelivery");
let nock = require("nock");
let supertest = require("supertest");
const { middleware, errorHandler } = require("../../framework/express");
let express = require("express");

describe(`emailDelivery: ${printPath("[test/thirdpartyemailpassword/emailDelivery.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        process.env.TEST_MODE = "testing";
        await killAllST();
        await cleanST();
    });

    it("test default backward compatibility api being called: reset password", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");

        let appName = undefined;
        let email = undefined;
        let passwordResetURL = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/password/reset")
            .reply(200, (uri, body) => {
                appName = body.appName;
                email = body.email;
                passwordResetURL = body.passwordResetURL;
                return {};
            });

        process.env.TEST_MODE = "production";

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);
        await delay(2);
        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(passwordResetURL, undefined);
    });

    it("test default backward compatibility api being called, error message not sent back to user: reset password", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");

        let appName = undefined;
        let email = undefined;
        let passwordResetURL = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/password/reset")
            .reply(500, (uri, body) => {
                appName = body.appName;
                email = body.email;
                passwordResetURL = body.passwordResetURL;
                return {};
            });

        process.env.TEST_MODE = "production";

        let result = await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);
        await delay(2);
        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(passwordResetURL, undefined);
        assert.strictEqual(result.body.status, "OK");
    });

    it("test backward compatibility: reset password (emailpassword user)", async function () {
        await startST();
        let email = undefined;
        let passwordResetURL = undefined;
        let timeJoined = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyEmailPassword.init({
                    resetPasswordUsingTokenFeature: {
                        createAndSendCustomEmail: async (input, passwordResetLink) => {
                            email = input.email;
                            passwordResetURL = passwordResetLink;
                            timeJoined = input.timeJoined;
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(passwordResetURL, undefined);
        assert.notStrictEqual(timeJoined, undefined);
    });

    it("test backward compatibility: reset password (non-existent user)", async function () {
        await startST();
        let functionCalled = false;
        let email = undefined;
        let passwordResetURL = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyEmailPassword.init({
                    resetPasswordUsingTokenFeature: {
                        createAndSendCustomEmail: async (input, passwordResetLink) => {
                            functionCalled = true;
                            email = input.email;
                            passwordResetURL = passwordResetLink;
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(functionCalled, false);
        assert.strictEqual(email, undefined);
        assert.strictEqual(passwordResetURL, undefined);

        await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(passwordResetURL, undefined);
    });

    it("test backward compatibility: reset password (thirdparty user)", async function () {
        await startST();
        let functionCalled = false;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyEmailPassword.init({
                    resetPasswordUsingTokenFeature: {
                        createAndSendCustomEmail: async (input, passwordResetLink) => {
                            functionCalled = true;
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await ThirdPartyEmailPassword.thirdPartySignInUp("custom-provider", "test-user-id", "test@example.com");

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(functionCalled, false);
    });

    it("test custom override: reset password", async function () {
        await startST();
        let email = undefined;
        let passwordResetURL = undefined;
        let type = undefined;
        let appName = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyEmailPassword.init({
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                sendEmail: async (input) => {
                                    email = input.user.email;
                                    passwordResetURL = input.passwordResetLink;
                                    type = input.type;
                                    await oI.sendEmail(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");

        process.env.TEST_MODE = "production";

        nock("https://api.supertokens.io")
            .post("/0/st/auth/password/reset")
            .reply(200, (uri, body) => {
                appName = body.appName;
                return {};
            });

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(type, "PASSWORD_RESET");
        assert.notStrictEqual(passwordResetURL, undefined);
    });

    it("test smtp service: reset password", async function () {
        await startST();
        let email = undefined;
        let passwordResetURL = undefined;
        let outerOverrideCalled = false;
        let sendRawEmailCalled = false;
        let getContentCalled = false;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                ThirdPartyEmailPassword.init({
                    emailDelivery: {
                        service: new SMTPService({
                            smtpSettings: {
                                host: "",
                                from: {
                                    email: "",
                                    name: "",
                                },
                                password: "",
                                port: 465,
                                secure: true,
                            },
                            override: (oI) => {
                                return {
                                    sendRawEmail: async (input) => {
                                        sendRawEmailCalled = true;
                                        assert.strictEqual(input.body, passwordResetURL);
                                        assert.strictEqual(input.subject, "custom subject");
                                        assert.strictEqual(input.toEmail, "test@example.com");
                                        email = input.toEmail;
                                    },
                                    getContent: async (input) => {
                                        getContentCalled = true;
                                        assert.strictEqual(input.type, "PASSWORD_RESET");
                                        passwordResetURL = input.passwordResetLink;
                                        return {
                                            body: input.passwordResetLink,
                                            toEmail: input.user.email,
                                            subject: "custom subject",
                                        };
                                    },
                                };
                            },
                        }),
                        override: (oI) => {
                            return {
                                sendEmail: async (input) => {
                                    outerOverrideCalled = true;
                                    await oI.sendEmail(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");

        await supertest(app)
            .post("/auth/user/password/reset/token")
            .set("rid", "thirdpartyemailpassword")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test@example.com",
                    },
                ],
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert(outerOverrideCalled);
        assert(getContentCalled);
        assert(sendRawEmailCalled);
        assert.notStrictEqual(passwordResetURL, undefined);
    });

    it("test default backward compatibility api being called: email verify", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdPartyEmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        let appName = undefined;
        let email = undefined;
        let emailVerifyURL = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/email/verify")
            .reply(200, (uri, body) => {
                appName = body.appName;
                email = body.email;
                emailVerifyURL = body.emailVerifyURL;
                return {};
            });

        process.env.TEST_MODE = "production";

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test default backward compatibility api being called, error message not sent back to user: email verify", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdPartyEmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        let appName = undefined;
        let email = undefined;
        let emailVerifyURL = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/email/verify")
            .reply(500, (uri, body) => {
                appName = body.appName;
                email = body.email;
                emailVerifyURL = body.emailVerifyURL;
                return {};
            });

        process.env.TEST_MODE = "production";

        let result = await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
        assert.strictEqual(result.body.status, "OK");
    });

    it("test backward compatibility: email verify (emailpassword user)", async function () {
        await startST();
        let idInCallback = undefined;
        let email = undefined;
        let emailVerifyURL = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: async (input, emailVerificationURLWithToken) => {
                        email = input.email;
                        idInCallback = input.id;
                        emailVerifyURL = emailVerificationURLWithToken;
                    },
                }),
                ThirdPartyEmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);
        await delay(2);
        assert.strictEqual(idInCallback, user.user.id);
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test backward compatibility: email verify (thirdparty user)", async function () {
        await startST();
        let idInCallback = undefined;
        let email = undefined;
        let emailVerifyURL = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: async (input, emailVerificationURLWithToken) => {
                        email = input.email;
                        idInCallback = input.id;
                        emailVerifyURL = emailVerificationURLWithToken;
                    },
                }),
                ThirdPartyEmailPassword.init({
                    // We need to add something to the providers array to make the thirdparty recipe initialize
                    providers: [/** @type {any} */ {}],
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdPartyEmailPassword.thirdPartySignInUp(
            "custom-provider",
            "test-user-id",
            "test@example.com"
        );
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);
        await delay(2);
        assert.strictEqual(idInCallback, user.user.id);
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test custom override: email verify", async function () {
        await startST();
        let email = undefined;
        let emailVerifyURL = undefined;
        let type = undefined;
        let appName = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({
                    mode: "OPTIONAL",
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                sendEmail: async (input) => {
                                    email = input.user.email;
                                    emailVerifyURL = input.emailVerifyLink;
                                    type = input.type;
                                    await oI.sendEmail(input);
                                },
                            };
                        },
                    },
                }),
                ThirdPartyEmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        process.env.TEST_MODE = "production";

        nock("https://api.supertokens.io")
            .post("/0/st/auth/email/verify")
            .reply(200, (uri, body) => {
                appName = body.appName;
                return {};
            });

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        process.env.TEST_MODE = "testing";

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(type, "EMAIL_VERIFICATION");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test smtp service: email verify", async function () {
        await startST();
        let email = undefined;
        let emailVerifyURL = undefined;
        let outerOverrideCalled = false;
        let sendRawEmailCalled = false;
        let getContentCalled = false;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailVerification.init({
                    mode: "OPTIONAL",
                    emailDelivery: {
                        service: new SMTPService({
                            smtpSettings: {
                                host: "",
                                from: {
                                    email: "",
                                    name: "",
                                },
                                password: "",
                                port: 465,
                                secure: true,
                            },
                            override: (oI) => {
                                return {
                                    sendRawEmail: async (input) => {
                                        sendRawEmailCalled = true;
                                        assert.strictEqual(input.body, emailVerifyURL);
                                        assert.strictEqual(input.subject, "custom subject");
                                        assert.strictEqual(input.toEmail, "test@example.com");
                                        email = input.toEmail;
                                    },
                                    getContent: async (input) => {
                                        getContentCalled = true;
                                        assert.strictEqual(input.type, "EMAIL_VERIFICATION");
                                        emailVerifyURL = input.emailVerifyLink;
                                        return {
                                            body: input.emailVerifyLink,
                                            toEmail: input.user.email,
                                            subject: "custom subject",
                                        };
                                    },
                                };
                            },
                        }),
                        override: (oI) => {
                            return {
                                sendEmail: async (input) => {
                                    outerOverrideCalled = true;
                                    await oI.sendEmail(input);
                                },
                            };
                        },
                    },
                }),
                ThirdPartyEmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdPartyEmailPassword.emailPasswordSignUp("test@example.com", "1234abcd");
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert(outerOverrideCalled);
        assert(getContentCalled);
        assert(sendRawEmailCalled);
        assert.notStrictEqual(emailVerifyURL, undefined);
    });
});
