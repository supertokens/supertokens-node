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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig, stopST, resetAll } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let ThirdPartyPasswordless = require("../../recipe/thirdpartypasswordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible, generateRandomCode } = require("../utils");
let ThirdPartyPasswordlessRecipe = require("../../lib/build/recipe/thirdpartypasswordless/recipe").default;

describe(`config tests: ${printPath("[test/thirdpartypasswordless/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    /*
        contactMethod: EMAIL_OR_PHONE
            - minimal config
    */
    it("test minimum config for thirdpartypasswordless with EMAIL_OR_PHONE contactMethod", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let thirdPartyPasswordlessRecipe = await ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
        assert(thirdPartyPasswordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE");
        assert(thirdPartyPasswordlessRecipe.config.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
    });

    /*
        contactMethod: EMAIL_OR_PHONE
            - adding custom validators for phone and email and making sure that they are called
    */
    it("test for thirdPartyPasswordless, adding custom validators for phone and email with EMAIL_OR_PHONE contactMethod", async function () {
        const connectionURI = await startST();

        let isValidateEmailAddressCalled = false;
        let isValidatePhoneNumberCalled = false;

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    validateEmailAddress: (email, _) => {
                        isValidateEmailAddressCalled = true;
                        return undefined;
                    },
                    validatePhoneNumber: (phoneNumber, _) => {
                        isValidatePhoneNumberCalled = true;
                        return undefined;
                    },
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                    },
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // check if validatePhoneNumber is called
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "+1234567890",
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

            assert(isValidatePhoneNumberCalled);
            assert(response.status === "OK");
        }

        {
            // check if validateEmailAddress is called
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "test@example.com",
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

            assert(isValidateEmailAddressCalled);
            assert(response.status === "OK");
        }
    });

    /**
     * - with contactMethod EMAIL_OR_PHONE
     *  - adding custom functions to send email and making sure that is called
     */

    it("test for thirdPartyPasswordless, use custom function to send email with EMAIL_OR_PHONE contactMethod", async function () {
        const connectionURI = await startST();

        let isCreateAndSendCustomEmailCalled = false;

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                isCreateAndSendCustomEmailCalled = true;
                            },
                        },
                    },
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // check if createAndSendCustomEmail is called
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "test@example.com",
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

            assert(isCreateAndSendCustomEmailCalled);
            assert(response.status === "OK");
        }
    });

    /**
     * - with contactMethod EMAIL_OR_PHONE
     *  - adding custom functions to send text SMS, and making sure that is called
     *
     */

    it("test for thirdPartyPasswordless, use custom function to send text SMS with EMAIL_OR_PHONE contactMethod", async function () {
        const connectionURI = await startST();

        let isCreateAndSendCustomTextMessageCalled = false;

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                    },
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                isCreateAndSendCustomTextMessageCalled = true;
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // check if createAndSendCustomTextMessage is called
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "+12345678901",
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

            assert(isCreateAndSendCustomTextMessageCalled);
            assert(response.status === "OK");
        }
    });

    /*
        contactMethod: PHONE
            - minimal input works
    */
    it("test for thirdPartyPasswordless minimum config with phone contactMethod", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let thirdPartyPasswordlessRecipe = await ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
        assert(thirdPartyPasswordlessRecipe.config.contactMethod === "PHONE");
        assert(thirdPartyPasswordlessRecipe.config.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
    });

    /*  contactMethod: PHONE
        If passed validatePhoneNumber, it gets called when the createCode API is called
            - If you return undefined from the function, the API works.
            - If you return a string from the function, the API throws a GENERIC ERROR
    */

    it("test for thirdPartyPasswordless, if validatePhoneNumber is called with phone contactMethod", async function () {
        const connectionURI = await startST();

        let isValidatePhoneNumberCalled = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                return;
                            },
                        },
                    },
                    validatePhoneNumber: (phoneNumber, _) => {
                        isValidatePhoneNumberCalled = true;
                        return undefined;
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // If you return undefined from the function, the API works
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "+1234567890",
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

            assert(isValidatePhoneNumberCalled);
            assert(response.status === "OK");
        }

        {
            // If you return a string from the function, the API throws a GENERIC ERROR

            await killAllST();
            const connectionURI = await startST();

            isValidatePhoneNumberCalled = false;

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
                    Session.init({ getTokenTransferMethod: () => "cookie" }),
                    ThirdPartyPasswordless.init({
                        contactMethod: "PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        smsDelivery: {
                            sendSms: async (input) => {
                                return;
                            },
                        },
                        validatePhoneNumber: (phoneNumber) => {
                            isValidatePhoneNumberCalled = true;
                            return "test error";
                        },
                    }),
                ],
            });

            {
                let response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/signinup/code")
                        .send({
                            phoneNumber: "+1234567890",
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

                assert(isValidatePhoneNumberCalled);
                assert(response.status === "GENERAL_ERROR");
                assert(response.message === "test error");
            }
        }
    });

    /*  contactMethod: PHONE
        If passed createAndSendCustomTextMessage, it gets called with the right inputs:
            - flowType: USER_INPUT_CODE -> userInputCode !== undefined && urlWithLinkCode == undefined
            - check all other inputs to this function are as expected
    */

    it("test for thirdPartyPasswordless, createAndSendCustomTextMessage with flowType: USER_INPUT_CODE and phone contact method", async function () {
        const connectionURI = await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
        let isOtherInputValid = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                if (input.userInputCode !== undefined && input.urlWithLinkCode === undefined) {
                                    isUserInputCodeAndUrlWithLinkCodeValid = true;
                                }

                                if (
                                    typeof input.codeLifetime === "number" &&
                                    typeof input.phoneNumber === "string" &&
                                    typeof input.preAuthSessionId === "string"
                                ) {
                                    isOtherInputValid = true;
                                }
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+12345678901",
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

        assert(response.status === "OK");
        assert(isUserInputCodeAndUrlWithLinkCodeValid);
        assert(isOtherInputValid);
    });

    /*  contactMethod: PHONE
        If passed createAndSendCustomTextMessage, it gets called with the right inputs:
            - flowType: MAGIC_LINK -> userInputCode === undefined && urlWithLinkCode !== undefined
    */

    it("test for thirdPartyPasswordless, createAndSendCustomTextMessage with flowType: MAGIC_LINK and phone contact method", async function () {
        const connectionURI = await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                if (input.userInputCode === undefined && input.urlWithLinkCode !== undefined) {
                                    isUserInputCodeAndUrlWithLinkCodeValid = true;
                                }
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+12345678901",
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

        assert(response.status === "OK");
        assert(isUserInputCodeAndUrlWithLinkCodeValid);
    });

    /*  contactMethod: PHONE
        If passed createAndSendCustomTextMessage, it gets called with the right inputs:
            - flowType: USER_INPUT_CODE_AND_MAGIC_LINK -> userInputCode !== undefined && urlWithLinkCode !== undefined
    */
    it("test for thirdPartyPasswordless, createAndSendCustomTextMessage with flowType: USER_INPUT_CODE_AND_MAGIC_LINK and phone contact method", async function () {
        const connectionURI = await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                if (input.userInputCode !== undefined && input.urlWithLinkCode !== undefined) {
                                    isUserInputCodeAndUrlWithLinkCodeValid = true;
                                }
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+12345678901",
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

        assert(response.status === "OK");
        assert(isUserInputCodeAndUrlWithLinkCodeValid);
    });

    /*  contactMethod: PHONE
        If passed createAndSendCustomTextMessage, it gets called with the right inputs:
            - if you throw an error from this function, it should contain a general error in the response
    */

    it("test with thirdPartyPasswordless, createAndSendCustomTextMessage, if error is thrown, it should contain a general error in the response", async function () {
        const connectionURI = await startST();

        let isCreateAndSendCustomTextMessageCalled = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                isCreateAndSendCustomTextMessageCalled = true;
                                throw new Error("test message");
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());
        let message = "";
        app.use((err, req, res, next) => {
            message = err.message;
            res.status(500).send(message);
        });

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+12345678901",
                })
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 500);
        assert(message === "test message");
        assert(isCreateAndSendCustomTextMessageCalled);
    });

    /*
    - contactMethod: EMAIL
        - minimal input works
    */

    it("test with thirdPartyPasswordless, minimum config with email contactMethod", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let thirdPartyPasswordlessRecipe = await ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
        assert(thirdPartyPasswordlessRecipe.config.contactMethod === "EMAIL");
        assert(thirdPartyPasswordlessRecipe.config.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
    });

    /*
    - contactMethod: EMAIL
    - if passed validateEmailAddress, it gets called when the createCode API is called
        - If you return undefined from the function, the API works.
        - If you return a string from the function, the API throws a GENERIC ERROR
    */

    it("test for thirdPartyPasswordless, if validateEmailAddress is called with email contactMethod", async function () {
        const connectionURI = await startST();

        let isValidateEmailAddressCalled = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    validateEmailAddress: (email) => {
                        isValidateEmailAddressCalled = true;
                        return undefined;
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // If you return undefined from the function, the API works
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "test@example.com",
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

            assert(isValidateEmailAddressCalled);
            assert(response.status === "OK");
        }

        {
            // If you return a string from the function, the API throws a GENERIC ERROR

            await killAllST();
            const connectionURI = await startST();

            isValidateEmailAddressCalled = false;

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
                    Session.init({ getTokenTransferMethod: () => "cookie" }),
                    ThirdPartyPasswordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                        validateEmailAddress: (email) => {
                            isValidateEmailAddressCalled = true;
                            return "test error";
                        },
                    }),
                ],
            });

            {
                let response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/signinup/code")
                        .send({
                            email: "test@example.com",
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

                assert(isValidateEmailAddressCalled);
                assert(response.status === "GENERAL_ERROR");
                assert(response.message === "test error");
            }
        }
    });

    /*
    - contactMethod: EMAIL
    - if passed createAndSendCustomEmail, it gets called with the right inputs:
        - flowType: USER_INPUT_CODE -> userInputCode !== undefined && urlWithLinkCode == undefined
        - check all other inputs to this function are as expected
    */

    it("test for thirdPartyPasswordless, createAndSendCustomEmail with flowType: USER_INPUT_CODE and email contact method", async function () {
        const connectionURI = await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
        let isOtherInputValid = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                if (input.userInputCode !== undefined && input.urlWithLinkCode === undefined) {
                                    isUserInputCodeAndUrlWithLinkCodeValid = true;
                                }

                                if (
                                    typeof input.codeLifetime === "number" &&
                                    typeof input.email === "string" &&
                                    typeof input.preAuthSessionId === "string"
                                ) {
                                    isOtherInputValid = true;
                                }
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
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

        assert(response.status === "OK");
        assert(isUserInputCodeAndUrlWithLinkCodeValid);
        assert(isOtherInputValid);
    });

    /*  contactMethod: EMAIL
        If passed createAndSendCustomEmail, it gets called with the right inputs:
            - flowType: MAGIC_LINK -> userInputCode === undefined && urlWithLinkCode !== undefined
    */

    it("test with thirdPartyPasswordless, createAndSendCustomEmail with flowType: MAGIC_LINK and email contact method", async function () {
        const connectionURI = await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                if (input.userInputCode === undefined && input.urlWithLinkCode !== undefined) {
                                    isUserInputCodeAndUrlWithLinkCodeValid = true;
                                }
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
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

        assert(response.status === "OK");
        assert(isUserInputCodeAndUrlWithLinkCodeValid);
    });

    /*  contactMethod: EMAIL
        If passed createAndSendCustomEmail, it gets called with the right inputs:
            - flowType: USER_INPUT_CODE_AND_MAGIC_LINK -> userInputCode !== undefined && urlWithLinkCode !== undefined
    */
    it("test with ThirdPartyPasswordless, createAndSendCustomTextMessage with flowType: USER_INPUT_CODE_AND_MAGIC_LINK and email contact method", async function () {
        const connectionURI = await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                if (input.userInputCode !== undefined && input.urlWithLinkCode !== undefined) {
                                    isUserInputCodeAndUrlWithLinkCodeValid = true;
                                }
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
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

        assert(response.status === "OK");
        assert(isUserInputCodeAndUrlWithLinkCodeValid);
    });

    /*  contactMethod: EMAIL
        If passed createAndSendCustomEmail, it gets called with the right inputs:
            - if you throw an error from this function, the status in the response should be a general error
    */

    it("test for thirdPartyPasswordless, that for createAndSendCustomEmail, if error is thrown, the status in the response should be a general error", async function () {
        const connectionURI = await startST();

        let isCreateAndSendCustomEmailCalled = false;
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                isCreateAndSendCustomEmailCalled = true;
                                throw new Error("test message");
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());
        let message = "";
        app.use((err, req, res, next) => {
            message = err.message;
            res.status(500).send(message);
        });

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
                })
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(response.status === 500);
        assert(message === "test message");
        assert(isCreateAndSendCustomEmailCalled);
    });

    /*
    - Missing compulsory configs throws as error:
        - flowType is necessary, contactMethod is necessary
    */

    it("test thirdPartyPasswordless, missing compulsory configs throws an error", async function () {
        const connectionURI = await startST();

        {
            // missing flowType
            try {
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
                        Session.init({ getTokenTransferMethod: () => "cookie" }),
                        ThirdPartyPasswordless.init({
                            contactMethod: "EMAIL",
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (err.message !== "Please pass flowType argument in the config") {
                    throw err;
                }
            }
        }

        {
            await killAllST();
            const connectionURI = await startST();

            // missing contactMethod
            try {
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
                        Session.init({ getTokenTransferMethod: () => "cookie" }),
                        ThirdPartyPasswordless.init({
                            flowType: "USER_INPUT_CODE",
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (err.message !== `Please pass one of "PHONE", "EMAIL" or "EMAIL_OR_PHONE" as the contactMethod`) {
                    throw err;
                }
            }
        }
    });

    /*
    - Passing getCustomUserInputCode:
    - Check that it is called when the createCode and resendCode APIs are called
        - Check that the result returned from this are actually what the user input code is
    - Check that is you return the same code everytime from this function and call resendCode API, you get USER_INPUT_CODE_ALREADY_USED_ERROR output from the API
    */

    it("test for thirdPartyPasswordless, passing getCustomUserInputCode using different codes", async function () {
        const connectionURI = await startST();

        let customCode = undefined;
        let userCodeSent = undefined;

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    getCustomUserInputCode: (input) => {
                        customCode = generateRandomCode(5);
                        return customCode;
                    },
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                userCodeSent = input.userInputCode;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let createCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
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

        assert(createCodeResponse.status === "OK");

        assert(userCodeSent === customCode);

        customCode = undefined;
        userCodeSent = undefined;

        let resendUserCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/resend")
                .send({
                    deviceId: createCodeResponse.deviceId,
                    preAuthSessionId: createCodeResponse.preAuthSessionId,
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
        assert(resendUserCodeResponse.status === "OK");
        assert(userCodeSent === customCode);
    });

    it("test for thirdPartyPasswordless, passing getCustomUserInputCode using the same code", async function () {
        const connectionURI = await startST();

        // using the same customCode
        let customCode = "customCode";
        let userCodeSent = undefined;

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    getCustomUserInputCode: (input) => {
                        return customCode;
                    },
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                userCodeSent = input.userInputCode;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let createCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
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

        assert(createCodeResponse.status === "OK");
        assert(userCodeSent === customCode);

        let createNewCodeForDeviceResponse = await ThirdPartyPasswordless.createNewCodeForDevice({
            tenantId: "public",
            deviceId: createCodeResponse.deviceId,
            userInputCode: customCode,
        });

        assert(createNewCodeForDeviceResponse.status === "USER_INPUT_CODE_ALREADY_USED_ERROR");

        let resendUserCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/resend")
                .send({
                    deviceId: createCodeResponse.deviceId,
                    preAuthSessionId: createCodeResponse.preAuthSessionId,
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

        assert(resendUserCodeResponse.status === "GENERAL_ERROR");
        assert(resendUserCodeResponse.message === "Failed to generate a one time code. Please try again");
    });

    // Check basic override usage
    it("test basic override usage in thirdPartyPasswordless", async function () {
        const connectionURI = await startST();

        let customDeviceId = "customDeviceId";

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                createCodePOST: async (input) => {
                                    let response = await oI.createCodePOST(input);
                                    response.deviceId = customDeviceId;
                                    return response;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let createCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: "test@example.com",
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

        assert(createCodeResponse.deviceId === customDeviceId);
    });

    it("test for thirdPartyPasswordless, default config for thirdparty", async function () {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [
                                    {
                                        clientId: "test",
                                        clientSecret: "test-secret",
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ],
        });

        let thirdPartyPasswordless = await ThirdPartyPasswordlessRecipe.getInstanceOrThrowError();
        let config = thirdPartyPasswordless.config;

        assert(config.providers.length === 1);
        let provider = config.providers[0];
        assert(provider.config.thirdPartyId === "google");
    });

    it("test for thirdPartyPasswordless, minimum config for thirdparty module, custom provider", async function () {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                    providers: [
                        {
                            config: {
                                thirdPartyId: "custom",
                                authorizationEndpoint: "https://test.com/oauth/auth",
                                tokenEndpoint: "https://test.com/oauth/token",
                                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
                            },
                            override: (oI) => {
                                return {
                                    ...oI,
                                    getUserInfo: async function ({ oAuthTokens }) {
                                        return {
                                            thirdPartyUserId: "user",
                                            email: {
                                                id: "email@test.com",
                                                isVerified: true,
                                            },
                                        };
                                    },
                                };
                            },
                        },
                    ],
                }),
            ],
        });
    });
});
