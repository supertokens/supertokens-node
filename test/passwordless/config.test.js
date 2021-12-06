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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig, stopST } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Passwordless = require("../../recipe/passwordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
let PasswordlessRecipe = require("../../lib/build/recipe/passwordless/recipe").default;

/*
TODO: We actually want to test all possible config inputs and make sure they work as expected

- contactMethod: PHONE
    - minimal input works
    - if passed validatePhoneNumber, it gets called when the createCode API is called
        - If you return undefined from the function, the API works.
        - If you return a string from the function, the API throws a GENERIC ERROR
    - if passed createAndSendCustomTextMessage, it gets called with the right inputs:
        - flowType: USER_INPUT_CODE -> userInputCode !== undefined && urlWithLinkCode == undefined
        - flowType: MAGIC_LINK -> userInputCode === undefined && urlWithLinkCode !== undefined
        - flowType: USER_INPUT_CODE_AND_MAGIC_LINK -> userInputCode !== undefined && urlWithLinkCode !== undefined
        - if you throw an error from this function, that is ignored by the API
        - check all other inputs to this function are as expected
- contactMethod: EMAIL
    - minimal input works
    - if passed validateEmailAddress, it gets called when the createCode API is called
        - If you return undefined from the function, the API works.
        - If you return a string from the function, the API throws a GENERIC ERROR
    - if passed createAndSendCustomEmail, it gets called with the right inputs:
        - flowType: USER_INPUT_CODE -> userInputCode !== undefined && urlWithLinkCode == undefined
        - flowType: MAGIC_LINK -> userInputCode === undefined && urlWithLinkCode !== undefined
        - flowType: USER_INPUT_CODE_AND_MAGIC_LINK -> userInputCode !== undefined && urlWithLinkCode !== undefined
        - if you throw an error from this function, that is ignored by the API
        - check all other inputs to this function are as expected
- Missing compulsory configs throws as error:
    - flowType is necessary, contactMethod is necessary
- Passing getLinkDomainAndPath should call that, and the resulting magic link (from API call and from Passwordless.createMagicLink function call) should use the custom link returned from the function
- Passing getCustomUserInputCode:
    - Check that it is called when the createCode and resendCode APIs are called
        - Check that the result returned from this are actually what the user input code is
    - Check that is you return the same code everytime from this function and call resendCode API, you get USER_INPUT_CODE_ALREADY_USED_ERROR output from the API
- Check basic override usage
*/

describe(`apisFunctions: ${printPath("[test/passwordless/apis.test.js]")}`, function () {
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
        contactMethod: PHONE
            - minimal input works
    */
    it("test minimum config with phone contactMethod", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        let passwordlessRecipe = await PasswordlessRecipe.getInstanceOrThrowError();
        assert(passwordlessRecipe.config.contactMethod === "PHONE");
        assert(passwordlessRecipe.config.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
    });

    /*  contactMethod: PHONE
        If passed validatePhoneNumber, it gets called when the createCode API is called
            - If you return undefined from the function, the API works.
            - If you return a string from the function, the API throws a GENERIC ERROR
    */

    it("test if validatePhoneNumber is called with phone contactMethod", async function () {
        await startST();

        let isValidatePhoneNumberCalled = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    validatePhoneNumber: (phoneNumber) => {
                        isValidatePhoneNumberCalled = true;
                        return undefined;
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
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
                        phoneNumber: "+919820367548",
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
            await startST();

            isValidatePhoneNumberCalled = false;

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
                    Session.init(),
                    Passwordless.init({
                        contactMethod: "PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
                            phoneNumber: "+919820367548",
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

    it("test createAndSendCustomTextMessage with flowType: USER_INPUT_CODE and phone contact method", async function () {
        await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
        let isOtherInputValid = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE",
                    createAndSendCustomTextMessage: (input) => {
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
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+919820367548",
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

    it("test createAndSendCustomTextMessage with flowType: MAGIC_LINK and phone contact method", async function () {
        await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "MAGIC_LINK",
                    createAndSendCustomTextMessage: (input) => {
                        if (input.userInputCode === undefined && input.urlWithLinkCode !== undefined) {
                            isUserInputCodeAndUrlWithLinkCodeValid = true;
                        }
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+919820367548",
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
    it("test createAndSendCustomTextMessage with flowType: USER_INPUT_CODE_AND_MAGIC_LINK and phone contact method", async function () {
        await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    createAndSendCustomTextMessage: (input) => {
                        if (input.userInputCode !== undefined && input.urlWithLinkCode !== undefined) {
                            isUserInputCodeAndUrlWithLinkCodeValid = true;
                        }
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+919820367548",
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
            - if you throw an error from this function, that is ignored by the API
    */

    it("test createAndSendCustomTextMessage, if error is thrown, it is ignored", async function () {
        await startST();

        let isCreateAndSendCustomTextMessageCalled = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "MAGIC_LINK",
                    createAndSendCustomTextMessage: (input) => {
                        isCreateAndSendCustomTextMessageCalled = true;
                        throw new Error("fail");
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber: "+919820367548",
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
        assert(isCreateAndSendCustomTextMessageCalled);
    });

    /*
    - contactMethod: EMAIL
        - minimal input works
    */

    it("test minimum config with email contactMethod", async function () {
        await startST();

        let isCreateAndSendCustomTextMessageCalled = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        let passwordlessRecipe = await PasswordlessRecipe.getInstanceOrThrowError();
        assert(passwordlessRecipe.config.contactMethod === "EMAIL");
        assert(passwordlessRecipe.config.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
    });

    /*
    - contactMethod: EMAIL
    - if passed validateEmailAddress, it gets called when the createCode API is called
        - If you return undefined from the function, the API works.
        - If you return a string from the function, the API throws a GENERIC ERROR
    */

    it("test if validateEmailAddress is called with email contactMethod", async function () {
        await startST();

        let isValidateEmailAddressCalled = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    validateEmailAddress: (email) => {
                        isValidateEmailAddressCalled = true;
                        return undefined;
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
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
            await startST();

            isValidateEmailAddressCalled = false;

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
                    Session.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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

    it("test createAndSendCustomEmail with flowType: USER_INPUT_CODE and email contact method", async function () {
        await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
        let isOtherInputValid = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    createAndSendCustomEmail: (input) => {
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
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
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

    it("test createAndSendCustomEmail with flowType: MAGIC_LINK and email contact method", async function () {
        await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "MAGIC_LINK",
                    createAndSendCustomEmail: (input) => {
                        if (input.userInputCode === undefined && input.urlWithLinkCode !== undefined) {
                            isUserInputCodeAndUrlWithLinkCodeValid = true;
                        }
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
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
    it("test createAndSendCustomTextMessage with flowType: USER_INPUT_CODE_AND_MAGIC_LINK and email contact method", async function () {
        await startST();

        let isUserInputCodeAndUrlWithLinkCodeValid = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    createAndSendCustomEmail: (input) => {
                        if (input.userInputCode !== undefined && input.urlWithLinkCode !== undefined) {
                            isUserInputCodeAndUrlWithLinkCodeValid = true;
                        }
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
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
            - if you throw an error from this function, that is ignored by the API
    */

    it("test createAndSendCustomEmail, if error is thrown, it is ignored", async function () {
        await startST();

        let isCreateAndSendCustomEmailCalled = false;
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "MAGIC_LINK",
                    createAndSendCustomEmail: (input) => {
                        isCreateAndSendCustomEmailCalled = true;
                        throw new Error("fail");
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
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
        assert(isCreateAndSendCustomEmailCalled);
    });

    /*
    - Missing compulsory configs throws as error:
        - flowType is necessary, contactMethod is necessary
    */

    it("test missing compulsory configs throws an error", async function () {
        await startST();

        {
            // missing flowType
            try {
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
                        Session.init(),
                        Passwordless.init({
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
            await startST();

            // missing contactMethod
            try {
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
                        Session.init(),
                        Passwordless.init({
                            flowType: "USER_INPUT_CODE",
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (err.message !== `Please pass one of "PHONE" or "EMAIL" as the contactMethod`) {
                    throw err;
                }
            }
        }
    });

    // Passing getLinkDomainAndPath should call that, and the resulting magic link (from API call and from Passwordless.createMagicLink function call) should use the custom link returned from the function
    it("test passing getLinkDomainAndPath", async function () {
        await startST();

        let magicLinkFromAPI = undefined;
        let customPath = "http://customPath.com";

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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "MAGIC_LINK",
                    getLinkDomainAndPath: (contactInfo) => {
                        return customPath;
                    },
                    createAndSendCustomEmail: (input) => {
                        magicLinkFromAPI = input.urlWithLinkCode;
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.9"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let magicLinkFromFunction = await Passwordless.createMagicLink({
            email: "test@example.com",
        });

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
        assert(magicLinkFromAPI.startsWith(customPath));
        assert(magicLinkFromFunction.startsWith(customPath));
    });
});
