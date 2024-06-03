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
let { isCDIVersionCompatible } = require("../utils");

describe(`smsDelivery: ${printPath("[test/passwordless/smsDelivery.test.js]")}`, function () {
    beforeEach(async function () {
        process.env.TEST_MODE = "testing";
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        process.env.TEST_MODE = "testing";
        await killAllST();
        await cleanST();
    });

    it("test default backward compatibility api being called: passwordless login", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                phoneNumber = input.phoneNumber;
                                codeLifetime = input.codeLifetime;
                                urlWithLinkCode = input.urlWithLinkCode;
                                userInputCode = input.userInputCode;
                            },
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let type = undefined;
        let isFirstFactor = undefined;
        let appName = undefined;
        STExpress.init({
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
                                    isFirstFactor = input.isFirstFactor;
                                    await oI.sendSms(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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
        assert(isFirstFactor);
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test twilio service: passwordless login", async function () {
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
        let outerOverrideCalled = false;
        let sendRawSmsCalled = false;
        let getContentCalled = false;
        let twilioAPICalled = false;
        STExpress.init({
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
                                        assert(input.isFirstFactor);
                                        userInputCode = input.userInputCode;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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
        const connectionURI = await startST();
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());
        let message = "";
        app.use((err, req, res, next) => {
            message = err.message;
            res.status(500).send(message);
        });

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
            .expect(500);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(result.status, 500);
        assert(message === "Request failed with status code 500");
    });

    it("test supertokens service: passwordless login", async function () {
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
        let outerOverrideCalled = false;
        let supertokensAPICalled = false;
        let apiKey = undefined;
        let type = undefined;
        let isFirstFactor = undefined;
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: new SupertokensService("API_KEY"),
                        override: (oI) => {
                            return {
                                sendSms: async (input) => {
                                    outerOverrideCalled = true;
                                    isFirstFactor = input.isFirstFactor;
                                    await oI.sendSms(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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
                isFirstFactor = body.smsInput.isFirstFactor;
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
        assert(isFirstFactor);
        assert(outerOverrideCalled);
        assert(supertokensAPICalled);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(apiKey, "API_KEY");
    });

    it("test default backward compatibility api being called, error message not sent back to user if response code is 429: passwordless login", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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

    it("test default backward compatibility api being called: resend code api", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        let appName = undefined;
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let loginCalled = false;
        let apiKey = "randomKey";

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                loginCalled = true;
                return {};
            });

        process.env.TEST_MODE = "production";

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);
        assert.strictEqual(loginCalled, true);

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

        await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
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

    it("test backward compatibility: resend code api", async function () {
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let sendCustomSMSCalled = false;
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                if (sendCustomSMSCalled) {
                                    phoneNumber = input.phoneNumber;
                                    codeLifetime = input.codeLifetime;
                                    urlWithLinkCode = input.urlWithLinkCode;
                                    userInputCode = input.userInputCode;
                                }
                                sendCustomSMSCalled = true;
                            },
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);
        await delay(2);
        assert.strictEqual(sendCustomSMSCalled, true);
        assert.strictEqual(phoneNumber, undefined);
        assert.strictEqual(urlWithLinkCode, undefined);
        assert.strictEqual(userInputCode, undefined);
        assert.strictEqual(codeLifetime, undefined);

        await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
            })
            .expect(200);
        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test custom override: resend code api", async function () {
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let type = undefined;
        let isFirstFactor = undefined;
        let appName = undefined;
        let overrideCalled = false;
        let loginCalled = false;
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        override: (oI) => {
                            return {
                                sendSms: async (input) => {
                                    /**
                                     * when the function is called for the first time,
                                     * it will be for signinup
                                     */
                                    if (overrideCalled) {
                                        phoneNumber = input.phoneNumber;
                                        urlWithLinkCode = input.urlWithLinkCode;
                                        userInputCode = input.userInputCode;
                                        codeLifetime = input.codeLifetime;
                                        type = input.type;
                                        isFirstFactor = input.isFirstFactor;
                                    }
                                    overrideCalled = true;
                                    await oI.sendSms(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        process.env.TEST_MODE = "production";

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                loginCalled = true;
                return {};
            });

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);
        assert.strictEqual(loginCalled, true);
        assert.strictEqual(overrideCalled, true);

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                appName = body.smsInput.appName;
                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
            })
            .expect(200);

        process.env.TEST_MODE = "testing";

        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(type, "PASSWORDLESS_LOGIN");
        assert(isFirstFactor);
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test twilio service: resend code api", async function () {
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
        let urlWithLinkCode = undefined;
        let outerOverrideCalled = false;
        let sendRawSmsCalled = false;
        let getContentCalled = false;
        let loginCalled = false;
        let twilioAPICalled = false;
        STExpress.init({
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
                                        /**
                                         * when the function is called for the first time,
                                         * it will be for signinup
                                         */
                                        if (sendRawSmsCalled) {
                                            assert.strictEqual(input.body, userInputCode);
                                            assert.strictEqual(input.toPhoneNumber, "+919909909998");
                                            phoneNumber = input.toPhoneNumber;
                                        }
                                        sendRawSmsCalled = true;
                                        await oI.sendRawSms(input);
                                    },
                                    getContent: async (input) => {
                                        /**
                                         * when the function is called for the first time,
                                         * it will be for signinup
                                         */
                                        if (getContentCalled) {
                                            userInputCode = input.userInputCode;
                                            urlWithLinkCode = input.urlWithLinkCode;
                                            codeLifetime = input.codeLifetime;
                                        }
                                        assert.strictEqual(input.type, "PASSWORDLESS_LOGIN");
                                        assert(input.isFirstFactor);
                                        getContentCalled = true;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        nock("https://api.twilio.com/2010-04-01")
            .post("/Accounts/ACTWILIO_ACCOUNT_SID/Messages.json")
            .reply(200, (uri, body) => {
                loginCalled = true;
                return {};
            });

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        await delay(2);
        assert(getContentCalled);
        assert(sendRawSmsCalled);
        assert(loginCalled);
        assert.strictEqual(phoneNumber, undefined);
        assert.strictEqual(urlWithLinkCode, undefined);
        assert.strictEqual(userInputCode, undefined);
        assert.strictEqual(codeLifetime, undefined);

        nock("https://api.twilio.com/2010-04-01")
            .post("/Accounts/ACTWILIO_ACCOUNT_SID/Messages.json")
            .reply(200, (uri, body) => {
                twilioAPICalled = true;
                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
            })
            .expect(200);

        await delay(2);
        assert.strictEqual(phoneNumber, "+919909909998");
        assert(outerOverrideCalled);
        assert(twilioAPICalled);
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
    });

    it("test default backward compatibility api being called, error message sent back to user: resend code api", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());
        let message = "";
        app.use((err, req, res, next) => {
            message = err.message;
            res.status(500).send(message);
        });

        let appName = undefined;
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let loginCalled = false;

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                loginCalled = true;
                return {};
            });

        process.env.TEST_MODE = "production";

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        assert.strictEqual(appName, undefined);
        assert.strictEqual(phoneNumber, undefined);
        assert.strictEqual(urlWithLinkCode, undefined);
        assert.strictEqual(userInputCode, undefined);
        assert.strictEqual(codeLifetime, undefined);
        assert.strictEqual(loginCalled, true);

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

        let result = await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
            })
            .expect(500);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(phoneNumber, "+919909909998");
        assert.notStrictEqual(urlWithLinkCode, undefined);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(result.status, 500);
        assert(message === "Request failed with status code 500");
    });

    it("test supertokens service: resend code api", async function () {
        const connectionURI = await startST();
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let userInputCode = undefined;
        let outerOverrideCalled = false;
        let supertokensAPICalled = false;
        let apiKey = undefined;
        let type = undefined;
        let isFirstFactor = undefined;
        let loginCalled = false;
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: new SupertokensService("API_KEY"),
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                loginCalled = true;
                return {};
            });

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);

        await delay(2);
        assert(loginCalled);

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                supertokensAPICalled = true;
                userInputCode = body.smsInput.userInputCode;
                apiKey = body.apiKey;
                phoneNumber = body.smsInput.phoneNumber;
                codeLifetime = body.smsInput.codeLifetime;
                type = body.smsInput.type;
                isFirstFactor = body.smsInput.isFirstFactor;

                return {};
            });

        await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
            })
            .expect(200);

        await delay(2);

        assert.strictEqual(phoneNumber, "+919909909998");
        assert.strictEqual(type, "PASSWORDLESS_LOGIN");
        assert(isFirstFactor);
        assert(outerOverrideCalled);
        assert(supertokensAPICalled);
        assert.notStrictEqual(userInputCode, undefined);
        assert.notStrictEqual(codeLifetime, undefined);
        assert(codeLifetime > 0);
        assert.strictEqual(apiKey, "API_KEY");
    });

    it("test default backward compatibility api being called, error message not sent back to user if response code is 429: resend code api", async function () {
        const connectionURI = await startST();
        STExpress.init({
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
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
            telemetry: false,
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();
        app.use(express.json());
        app.use(middleware());
        app.use(errorHandler());

        let appName = undefined;
        let phoneNumber = undefined;
        let codeLifetime = undefined;
        let urlWithLinkCode = undefined;
        let userInputCode = undefined;
        let loginCalled = false;

        nock("https://api.supertokens.com")
            .post("/0/services/sms")
            .reply(200, (uri, body) => {
                loginCalled = true;
                return {};
            });

        process.env.TEST_MODE = "production";

        let response = await supertest(app)
            .post("/auth/signinup/code")
            .set("rid", "passwordless")
            .send({
                phoneNumber: "+919909909998",
            })
            .expect(200);
        assert.strictEqual(loginCalled, true);

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

        let result = await supertest(app)
            .post("/auth/signinup/code/resend")
            .set("rid", "passwordless")
            .send({
                deviceId: response.body.deviceId,
                preAuthSessionId: response.body.preAuthSessionId,
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
