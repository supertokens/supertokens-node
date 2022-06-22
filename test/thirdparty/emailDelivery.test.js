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
let Thirdparty = require("../../recipe/thirdparty");
let { STMPService } = require("../../recipe/thirdparty/emaildelivery");
let nock = require("nock");
let supertest = require("supertest");
const { middleware, errorHandler } = require("../../framework/express");
let express = require("express");

describe(`emailDelivery: ${printPath("[test/thirdparty/emailDelivery.test.js]")}`, function () {
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
        process.env.TEST_MODE = "testing";
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
                Thirdparty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider],
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

        let user = await Thirdparty.signInUp("supertokens", "test-user-id", {
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
            .set("rid", "thirdparty")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test backward compatibility: email verify", async function () {
        await startST();
        let email = undefined;
        let emailVerifyURL = undefined;
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
                Thirdparty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider],
                    },
                    emailVerificationFeature: {
                        createAndSendCustomEmail: async (input, emailVerificationURLWithToken) => {
                            email = input.email;
                            emailVerifyURL = emailVerificationURLWithToken;
                            timeJoined = input.timeJoined;
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

        let user = await Thirdparty.signInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "thirdparty")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);
        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
        assert.notStrictEqual(timeJoined, undefined);
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
                Thirdparty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider],
                    },
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

        let user = await Thirdparty.signInUp("supertokens", "test-user-id", {
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
            .set("rid", "thirdparty")
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
                Thirdparty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider],
                    },
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

        let user = await Thirdparty.signInUp("supertokens", "test-user-id", {
            id: "test@example.com",
            isVerified: false,
        });
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "thirdparty")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert(outerOverrideCalled);
        assert(getContentCalled);
        assert(sendRawEmailCalled);
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
                Thirdparty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider],
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

        let user = await Thirdparty.signInUp("supertokens", "test-user-id", {
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
            .set("rid", "thirdparty")
            .set("Cookie", ["sAccessToken=" + res.accessToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
        assert.strictEqual(result.body.status, "OK");
    });
});
