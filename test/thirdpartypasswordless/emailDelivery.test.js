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
let ThirdpartyPasswordless = require("../../recipe/thirdpartypasswordless");
let { STMPService } = require("../../recipe/thirdpartypasswordless/emaildelivery");
let nock = require("nock");
let supertest = require("supertest");
const { middleware, errorHandler } = require("../../framework/express");
let express = require("express");

describe(`emailDelivery: ${printPath("[test/thirdpartypasswordless/emailDelivery.test.js]")}`, function () {
    before(function () {
        this.customProvider = {
            id: "supertokens",
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
                            id: authCodeResponse.id,
                            email: {
                                id: authCodeResponse.email,
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
                ThirdpartyPasswordless.init({
                    providers: [this.customProvider],
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdpartyPasswordless.thirdPartySignInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
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
            .set("rid", "thirdpartypasswordless")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
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
                ThirdpartyPasswordless.init({
                    providers: [this.customProvider],
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdpartyPasswordless.thirdPartySignInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
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
            .set("rid", "thirdpartypasswordless")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
        assert.strictEqual(result.body.status, "OK");
    });

    it("test backward compatibility: email verify", async function () {
        await startST();
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
                ThirdpartyPasswordless.init({
                    providers: [this.customProvider],
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailVerificationFeature: {
                        createAndSendCustomEmail: async (input, emailVerificationURLWithToken) => {
                            email = input.email;
                            emailVerifyURL = emailVerificationURLWithToken;
                        },
                    },
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdpartyPasswordless.thirdPartySignInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "thirdpartypasswordless")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);
        await delay(2);
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
                ThirdpartyPasswordless.init({
                    providers: [this.customProvider],
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdpartyPasswordless.thirdPartySignInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
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
            .set("rid", "thirdpartypasswordless")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
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
                ThirdpartyPasswordless.init({
                    providers: [this.customProvider],
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: new STMPService({
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
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, req.body.id, {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdpartyPasswordless.thirdPartySignInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "thirdpartypasswordless")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert(outerOverrideCalled);
        assert(getContentCalled);
        assert(sendRawEmailCalled);
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test default backward compatibility api being called: passwordless login", async function () {
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
                ThirdpartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        let appName = undefined;
        let email = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/passwordless/login")
            .reply(200, (uri, body) => {
                appName = body.appName;
                email = body.email;
                codeLifetime = body.codeLifetime;
                urlWithLinkCode = body.urlWithLinkCode;
                userInputCode = body.userInputCode;
                return {};
            });

        process.env.TEST_MODE = "production";

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "thirdpartypasswordless")
            .send({
                email: "test@example.com",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test backward compatibility: passwordless login", async function () {
        await startST();
        let email = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
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
                ThirdpartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    createAndSendCustomEmail: async (input) => {
                        email = input.email;
                        codeLifetime = input.codeLifetime;
                        urlWithLinkCode = input.urlWithLinkCode;
                        userInputCode = input.userInputCode;
                    },
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "thirdpartypasswordless")
            .send({
                email: "test@example.com",
            })
            .expect(200);
        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test custom override: passwordless login", async function () {
        await startST();
        let email = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
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
                ThirdpartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                sendEmail: async (input) => {
                                    email = input.email;
                                    urlWithLinkCode = input.urlWithLinkCode;
                                    userInputCode = input.userInputCode;
                                    codeLifetime = input.codeLifetime;
                                    type = input.type;
                                    await oI.sendEmail(input);
                                },
                            };
                        },
                    },
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        process.env.TEST_MODE = "production";

        nock("https://api.supertokens.io")
            .post("/0/st/auth/passwordless/login")
            .reply(200, (uri, body) => {
                appName = body.appName;
                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "thirdpartypasswordless")
            .send({
                email: "test@example.com",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(type, "PASSWORDLESS_LOGIN");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test smtp service: passwordless login", async function () {
        await startST();
        let email = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
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
                ThirdpartyPasswordless.init({
                    providers: [this.customProvider],
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: new STMPService({
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
                                        assert.strictEqual(input.body, userInputCode);
                                        assert.strictEqual(input.subject, urlWithLinkCode);
                                        assert.strictEqual(input.toEmail, "test@example.com");
                                        email = input.toEmail;
                                    },
                                    getContent: async (input) => {
                                        getContentCalled = true;
                                        assert.strictEqual(input.type, "PASSWORDLESS_LOGIN");
                                        userInputCode = input.userInputCode;
                                        urlWithLinkCode = input.urlWithLinkCode;
                                        codeLifetime = input.codeLifetime;
                                        return {
                                            body: input.userInputCode,
                                            toEmail: input.email,
                                            subject: input.urlWithLinkCode,
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
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "thirdpartypasswordless")
            .send({
                email: "test@example.com",
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert(outerOverrideCalled);
        assert(getContentCalled);
        assert(sendRawEmailCalled);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test default backward compatibility api being called, error message sent back to user: passwordless login", async function () {
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
                ThirdpartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init(),
            ],
            telemetry: false,
        });

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        let appName = undefined;
        let email = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/passwordless/login")
            .reply(500, (uri, body) => {
                appName = body.appName;
                email = body.email;
                codeLifetime = body.codeLifetime;
                urlWithLinkCode = body.urlWithLinkCode;
                userInputCode = body.userInputCode;
                return {};
            });

        process.env.TEST_MODE = "production";

        let result = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "thirdpartypasswordless")
            .send({
                email: "test@example.com",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(result.body.status, "GENERAL_ERROR");
    });
});
