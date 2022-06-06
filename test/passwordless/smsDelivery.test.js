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
const { printPath, setupST, startST, killAllST, cleanST, delay } = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let Passwordless = require("../../recipe/passwordless");
let { TwilioService, SupertokensService } = require("../../recipe/passwordless/smsdelivery");
let nock = require("nock");
let supertest = require("supertest");
const { middleware, errorHandler } = require("../../framework/express");
let express = require("express");

describe(`smsDelivery: ${printPath("[test/passwordless/smsDelivery.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
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
                Passwordless.init({
                    contactMethod: "PHONE",
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
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let apiKey = "randomKey";

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                appName = body.smsInput.appName;
                phoneNumber = body.smsInput.phoneNumber;
                codeLifetime = body.smsInput.codeLifetime;
                urlWithLinkCode = body.smsInput.urlWithLinkCode;
                userInputCode = body.smsInput.userInputCode;
                apiKey = body.apiKey;
                return {};
            });

        process.env.TEST_MODE = "production";

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert.strictEqual(apiKey, undefined);
        assert(codeLifetime > 0);
    });

    it("test backward compatibility: passwordless login", async function () {
        await startST();
        let phoneNumber = undefined;
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    createAndSendCustomTextMessage: async (input) => {
                        phoneNumber = input.phoneNumber;
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
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);
        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test custom override: passwordless login", async function () {
        await startST();
        let phoneNumber = undefined;
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        override: (oI) => {
                            return {
                                sendSms: async (input) => {
                                    phoneNumber = input.phoneNumber;
                                    urlWithLinkCode = input.urlWithLinkCode;
                                    userInputCode = input.userInputCode;
                                    codeLifetime = input.codeLifetime;
                                    type = input.type;
                                    await oI.sendSms(input);
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

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                appName = body.smsInput.appName;
                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(type, "PASSWORDLESS_LOGIN");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test twilio service: passwordless login", async function () {
        await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
        let outerOverrideCalled = false;
        let sendRawSmsCalled = false;
        let getContentCalled = true;
        let twilioAPICalled = false;
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: new TwilioService({
                            twilioSettings: {
                                accountSid: "ACTWILIO_ACCOUNT_SID",
                                authToken: "test-token",
                                from: "+919909909999",
                            },
                            override: (oI) => {
                                return {
                                    sendRawSms: async (input) => {
                                        sendRawSmsCalled = true;
                                        assert.strictEqual(input.body, userInputCode);
                                        assert.strictEqual(input.toPhoneNumber, "+919909909998");
                                        phoneNumber = input.toPhoneNumber;
                                        await oI.sendRawSms(input);
                                    },
                                    getContent: async (input) => {
                                        getContentCalled = true;
                                        assert.strictEqual(input.type, "PASSWORDLESS_LOGIN");
                                        userInputCode = input.userInputCode;
                                        urlWithLinkCode = input.urlWithLinkCode;
                                        codeLifetime = input.codeLifetime;
                                        return {
                                            body: input.userInputCode,
                                            toPhoneNumber: input.phoneNumber,
                                        };
                                    },
                                };
                            },
                        }),
                        override: (oI) => {
                            return {
                                sendSms: async (input) => {
                                    outerOverrideCalled = true;
                                    await oI.sendSms(input);
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

        nock("https://api.twilio.com/2010-04-01")
            .post("/Accounts/ACTWILIO_ACCOUNT_SID/Messages.json")
            .reply(200, (uri, body) => {
                twilioAPICalled = true;
                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert(outerOverrideCalled);
        assert(sendRawSmsCalled);
        assert(getContentCalled);
        assert(twilioAPICalled);
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
                Passwordless.init({
                    contactMethod: "PHONE",
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
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(500, (uri, body) => {
                appName = body.smsInput.appName;
                phoneNumber = body.smsInput.phoneNumber;
                codeLifetime = body.smsInput.codeLifetime;
                urlWithLinkCode = body.smsInput.urlWithLinkCode;
                userInputCode = body.smsInput.userInputCode;
                return {};
            });

        process.env.TEST_MODE = "production";

        let result = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(result.body.status, "GENERAL_ERROR");
    });

    it("test supertokens service: passwordless login", async function () {
        await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
        let outerOverrideCalled = false;
        let supertokensAPICalled = false;
        let apiKey = undefined;
        let type = undefined;
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: new SupertokensService({
                            apiKey: "API_KEY",
                        }),
                        override: (oI) => {
                            return {
                                sendSms: async (input) => {
                                    outerOverrideCalled = true;
                                    await oI.sendSms(input);
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

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                supertokensAPICalled = true;
                userInputCode = body.smsInput.userInputCode;
                apiKey = body.apiKey;
                phoneNumber = body.smsInput.phoneNumber;
                codeLifetime = body.smsInput.codeLifetime;
                type = body.smsInput.type;
                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.strictEqual(type, "PASSWORDLESS_LOGIN");
        assert(outerOverrideCalled);
        assert(supertokensAPICalled);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(apiKey, "API_KEY");
    });

    it("test default backward compatibility api being called, error message not sent back to user if response code is 429: passwordless login", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
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
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(429, (uri, body) => {
                appName = body.smsInput.appName;
                phoneNumber = body.smsInput.phoneNumber;
                codeLifetime = body.smsInput.codeLifetime;
                urlWithLinkCode = body.smsInput.urlWithLinkCode;
                userInputCode = body.smsInput.userInputCode;
                return {};
            });

        process.env.TEST_MODE = "production";

        let result = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(result.body.status, "OK");
    });
});
