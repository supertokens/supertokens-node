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
    startSTWithMultitenancy,
    killAllST,
    cleanST,
    setKeyValueInConfig,
    stopST,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Passwordless = require("../../recipe/passwordless");
let Multitenancy = require("../../recipe/multitenancy");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");
const { default: RecipeUserId } = require("../../lib/build/recipeUserId");
let ThirdParty = require("../../recipe/thirdparty");
let EmailPassword = require("../../recipe/emailpassword");

describe(`apisFunctions: ${printPath("[test/passwordless/apis.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
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

    it("test emailExistsAPI on old path with email password conflicting path, but different rid", async function () {
        const connectionURI = await startST();

        let emailPasswordEmailExistsCalled = false;
        let passwordlessEmailExistsCalled = false;

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
                EmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailExistsGET: async (input) => {
                                    emailPasswordEmailExistsCalled = true;
                                    return oI.emailExistsGET(input);
                                },
                            };
                        },
                    },
                }),
                Passwordless.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailExistsGET: async (input) => {
                                    passwordlessEmailExistsCalled = true;
                                    return oI.emailExistsGET(input);
                                },
                            };
                        },
                    },
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .set("rid", "passwordless")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === false);
            assert(passwordlessEmailExistsCalled === true);
        }

        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .set("rid", "thirdpartypasswordless")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === false);
            assert(passwordlessEmailExistsCalled === true);
        }
        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .set("rid", "thirdpartyemailpassword")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === true);
            assert(passwordlessEmailExistsCalled === false);
        }
        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .set("rid", "emailpassword")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === true);
            assert(passwordlessEmailExistsCalled === false);
        }
        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === true);
            assert(passwordlessEmailExistsCalled === false);
        }
    });

    it("test emailExistsAPI conflicting with email password", async function () {
        const connectionURI = await startST();

        let emailPasswordEmailExistsCalled = false;
        let passwordlessEmailExistsCalled = false;

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
                EmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailExistsGET: async (input) => {
                                    emailPasswordEmailExistsCalled = true;
                                    return oI.emailExistsGET(input);
                                },
                            };
                        },
                    },
                }),
                Passwordless.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailExistsGET: async (input) => {
                                    passwordlessEmailExistsCalled = true;
                                    return oI.emailExistsGET(input);
                                },
                            };
                        },
                    },
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === false);
            assert(passwordlessEmailExistsCalled === true);
        }
        await EmailPassword.signUp("public", "test@example.com", "Asdf12..");
        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
            assert(emailPasswordEmailExistsCalled === false);
            assert(passwordlessEmailExistsCalled === true);
        }
        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/emailpassword/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === true);
            assert(emailPasswordEmailExistsCalled === true);
            assert(passwordlessEmailExistsCalled === false);
        }
        await Passwordless.signInUp({
            email: "test@example.com",
            tenantId: "public",
        });
        {
            emailPasswordEmailExistsCalled = false;
            passwordlessEmailExistsCalled = false;
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === true);
            assert(emailPasswordEmailExistsCalled === false);
            assert(passwordlessEmailExistsCalled === true);
        }
    });

    it("test APIs still work with thirdpartypasswordless recipe", async function () {
        const connectionURI = await startST();

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                userInputCode = input.userInputCode;
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

        const email = "test@example.com";
        // createCodeAPI with email
        let validCreateCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .set("rid", "thirdpartypasswordless")
                .send({
                    email: email,
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
        assert(validCreateCodeResponse.status === "OK");
        assert(typeof validCreateCodeResponse.deviceId === "string");
        assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
        assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
        assert(Object.keys(validCreateCodeResponse).length === 4);

        // consumeCode API
        let validUserInputCodeResponse = await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .set("rid", "thirdpartypasswordless")
                .send({
                    preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
                    userInputCode,
                    deviceId: validCreateCodeResponse.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );

        checkConsumeResponse(validUserInputCodeResponse, {
            email,
            phoneNumber: undefined,
            isNew: true,
            isPrimary: false,
        });
    });

    /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - finish full sign up / in flow with email (create code -> consume code)
     */

    it("test the sign up /in flow with email using the EMAIL_OR_PHONE contactMethod", async function () {
        const connectionURI = await startST();

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                userInputCode = input.userInputCode;
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

        const email = "test@example.com";
        // createCodeAPI with email
        let validCreateCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    email: email,
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
        assert(validCreateCodeResponse.status === "OK");
        assert(typeof validCreateCodeResponse.deviceId === "string");
        assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
        assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
        assert(Object.keys(validCreateCodeResponse).length === 4);

        // consumeCode API
        let validUserInputCodeResponse = await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
                    userInputCode,
                    deviceId: validCreateCodeResponse.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );

        checkConsumeResponse(validUserInputCodeResponse, {
            email,
            phoneNumber: undefined,
            isNew: true,
            isPrimary: false,
        });
    });

    /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - finish full sign up / in flow with phoneNumber (create code -> consume code)
     */

    it("test the sign up /in flow with phoneNumber using the EMAIL_OR_PHONE contactMethod", async function () {
        const connectionURI = await startST();

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                Passwordless.init({
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
                                userInputCode = input.userInputCode;
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

        const phoneNumber = "+12345678901";
        // createCodeAPI with phoneNumber
        let validCreateCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code")
                .send({
                    phoneNumber,
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
        assert(validCreateCodeResponse.status === "OK");
        assert(typeof validCreateCodeResponse.deviceId === "string");
        assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
        assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
        assert(Object.keys(validCreateCodeResponse).length === 4);

        // consumeCode API
        let validUserInputCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
                    userInputCode,
                    deviceId: validCreateCodeResponse.deviceId,
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

        checkConsumeResponse(validUserInputCodeResponse, {
            email: undefined,
            phoneNumber,
            isNew: true,
            isPrimary: false,
        });
    });

    /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - create code with email and then resend code and make sure that sending email function is called  while resending code
     */
    it("test creating a code with email and then resending the code and check that the sending custom email function is called while using the EMAIL_OR_PHONE contactMethod", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                isCreateAndSendCustomEmailCalled = true;
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

        // createCodeAPI with email
        let validCreateCodeResponse = await new Promise((resolve) =>
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
        assert(validCreateCodeResponse.status === "OK");
        assert(isCreateAndSendCustomEmailCalled);

        isCreateAndSendCustomEmailCalled = false;

        // resendCode API
        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/resend")
                .send({
                    deviceId: validCreateCodeResponse.deviceId,
                    preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
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

    /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - create code with phone and then resend code and make sure that sending SMS function is called  while resending code
     */
    it("test creating a code with phone and then resending the code and check that the sending custom SMS function is called while using the EMAIL_OR_PHONE contactMethod", async function () {
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
                Passwordless.init({
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

        // createCodeAPI with email
        let validCreateCodeResponse = await new Promise((resolve) =>
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
        assert(validCreateCodeResponse.status === "OK");
        assert(isCreateAndSendCustomTextMessageCalled);

        isCreateAndSendCustomTextMessageCalled = false;

        // resendCode API
        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/resend")
                .send({
                    deviceId: validCreateCodeResponse.deviceId,
                    preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
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

    /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - sending both email and phone in createCode API throws bad request
     *   - sending neither email and phone in createCode API throws bad request
     */
    it("test invalid input to createCodeAPI while using the EMAIL_OR_PHONE contactMethod", async function () {
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
                Passwordless.init({
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
            // sending both email and phone in createCode API throws bad request
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "+12345678901",
                        email: "test@example.com",
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.strictEqual(response.message, "Please provide exactly one of email or phoneNumber");
        }

        {
            // sending neither email and phone in createCode API throws bad request
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({})
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.strictEqual(response.message, "Please provide exactly one of email or phoneNumber");
        }

        {
            // sending empty body in createCode API throws bad request
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert.strictEqual(response.message, "Please provide exactly one of email or phoneNumber");
        }
    });

    /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - do full sign in with email, then manually add a user's phone to their user Info, then so sign in with that phone number and make sure that the same userId signs in.
    
    */

    it("test adding phoneNumber to a users info and signing in will sign in the same user, using the EMAIL_OR_PHONE contactMethod", async function () {
        const connectionURI = await startST();

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                userInputCode = input.userInputCode;
                                return;
                            },
                        },
                    },
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                userInputCode = input.userInputCode;
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

        // create a passwordless user with email
        let emailCreateCodeResponse = await new Promise((resolve) =>
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
        assert(emailCreateCodeResponse.status === "OK");

        // consumeCode API
        let emailUserInputCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: emailCreateCodeResponse.preAuthSessionId,
                    userInputCode,
                    deviceId: emailCreateCodeResponse.deviceId,
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

        assert(emailUserInputCodeResponse.status === "OK");

        // add users phoneNumber to userInfo
        await Passwordless.updateUser({
            recipeUserId: STExpress.convertToRecipeUserId(emailUserInputCodeResponse.user.loginMethods[0].recipeUserId),
            phoneNumber: "+12345678901",
        });

        // sign in user with phone numbers
        let phoneCreateCodeResponse = await new Promise((resolve) =>
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

        assert(phoneCreateCodeResponse.status === "OK");

        let phoneUserInputCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: phoneCreateCodeResponse.preAuthSessionId,
                    userInputCode,
                    deviceId: phoneCreateCodeResponse.deviceId,
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

        assert(phoneUserInputCodeResponse.status === "OK");

        // check that the same user has signed in
        assert(phoneUserInputCodeResponse.user.id === emailUserInputCodeResponse.user.id);
    });

    // check that if user has not given linkCode nor (deviceId+userInputCode), it throws a bad request error.
    it("test not passing any fields to consumeCodeAPI", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
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
            // dont send linkCode or (deviceId+userInputCode)
            let badResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: "sessionId",
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(badResponse.res.statusMessage === "Bad Request");
            assert(
                JSON.parse(badResponse.text).message ===
                    "Please provide one of (linkCode) or (deviceId+userInputCode) and not both"
            );
        }
    });

    it("test consumeCodeAPI with magic link", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
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

        const email = "test@example.com";
        let codeInfo = await Passwordless.createCode({
            tenantId: "public",
            email,
        });

        {
            // send an invalid linkCode
            let letInvalidLinkCodeResponse = await request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: codeInfo.preAuthSessionId,
                    linkCode: "invalidLinkCode",
                })
                .expect(200);

            assert.strictEqual(letInvalidLinkCodeResponse.body.status, "RESTART_FLOW_ERROR");
        }

        {
            // send a valid linkCode
            let validLinkCodeResponse = await request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: codeInfo.preAuthSessionId,
                    linkCode: codeInfo.linkCode,
                })
                .expect(200);

            checkConsumeResponse(validLinkCodeResponse.body, {
                email,
                phoneNumber: undefined,
                isNew: true,
                isPrimary: false,
            });
        }
    });

    it("test consumeCodeAPI with code", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
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

        const email = "test@example.com";
        let codeInfo = await Passwordless.createCode({
            tenantId: "public",
            email,
        });

        {
            // send an incorrect userInputCode
            let incorrectUserInputCodeResponse = await request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: codeInfo.preAuthSessionId,
                    userInputCode: "invalidLinkCode",
                    deviceId: codeInfo.deviceId,
                })
                .expect(200);

            assert(incorrectUserInputCodeResponse.body.status === "INCORRECT_USER_INPUT_CODE_ERROR");
            assert(incorrectUserInputCodeResponse.body.failedCodeInputAttemptCount === 1);
            //checking default value for maximumCodeInputAttempts is 5
            assert(incorrectUserInputCodeResponse.body.maximumCodeInputAttempts === 5);
            assert(Object.keys(incorrectUserInputCodeResponse.body).length === 3);
        }

        {
            // send a valid userInputCode
            let validUserInputCodeResponse = await request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: codeInfo.preAuthSessionId,
                    userInputCode: codeInfo.userInputCode,
                    deviceId: codeInfo.deviceId,
                })
                .expect(200);

            checkConsumeResponse(validUserInputCodeResponse.body, {
                email,
                phoneNumber: undefined,
                isNew: true,
                isPrimary: false,
            });
        }

        {
            // send a used userInputCode
            let usedUserInputCodeResponse = await request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: codeInfo.preAuthSessionId,
                    userInputCode: codeInfo.userInputCode,
                    deviceId: codeInfo.deviceId,
                })
                .expect(200);
            assert(usedUserInputCodeResponse.body.status === "RESTART_FLOW_ERROR");
        }
    });

    it("test consumeCodeAPI with expired code", async function () {
        const connectionURI = await startST({
            coreConfig: {
                passwordless_code_lifetime: 1000, // one second lifetime
            },
        });

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
                Passwordless.init({
                    contactMethod: "EMAIL",
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
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            await new Promise((r) => setTimeout(r, 2000)); // wait for code to expire
            let expiredUserInputCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        userInputCode: codeInfo.userInputCode,
                        deviceId: codeInfo.deviceId,
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

            assert(expiredUserInputCodeResponse.status === "EXPIRED_USER_INPUT_CODE_ERROR");
            assert(expiredUserInputCodeResponse.failedCodeInputAttemptCount === 1);
            //checking default value for maximumCodeInputAttempts is 5
            assert(expiredUserInputCodeResponse.maximumCodeInputAttempts === 5);
            assert(Object.keys(expiredUserInputCodeResponse).length === 3);
        }
    });

    it("test createCodeAPI with email", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL",
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
            // passing valid field
            let validCreateCodeResponse = await new Promise((resolve) =>
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
            assert(validCreateCodeResponse.status === "OK");
            assert(typeof validCreateCodeResponse.deviceId === "string");
            assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
            assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
            assert(Object.keys(validCreateCodeResponse).length === 4);
        }

        {
            // passing invalid email
            let invalidEmailCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "invalidEmail",
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
            assert(invalidEmailCreateCodeResponse.status === "GENERAL_ERROR");
            assert(invalidEmailCreateCodeResponse.message === "Email is invalid");
        }
    });

    it("test createCodeAPI with phoneNumber", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
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
            // passing valid field
            let validCreateCodeResponse = await new Promise((resolve) =>
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
            assert(validCreateCodeResponse.status === "OK");
            assert(typeof validCreateCodeResponse.deviceId === "string");
            assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
            assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
            assert(Object.keys(validCreateCodeResponse).length === 4);
        }

        {
            // passing invalid phoneNumber
            let invalidPhoneNumberCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "123",
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
            assert(invalidPhoneNumberCreateCodeResponse.status === "GENERAL_ERROR");
            assert(invalidPhoneNumberCreateCodeResponse.message === "Phone number is invalid");
        }
    });

    it("test magicLink format in createCodeAPI", async function () {
        const connectionURI = await startST();

        let magicLinkURL = undefined;
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                magicLinkURL = new URL(input.urlWithLinkCode);
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
            // passing valid field
            let validCreateCodeResponse = await new Promise((resolve) =>
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

            assert(validCreateCodeResponse.status === "OK");

            // check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?preAuthSessionId=<some string>#linkCode
            assert(magicLinkURL.hostname === "supertokens.io");
            assert(magicLinkURL.pathname === "/auth/verify");
            assert(magicLinkURL.searchParams.get("rid") === null);
            assert(magicLinkURL.searchParams.get("preAuthSessionId") === validCreateCodeResponse.preAuthSessionId);
            assert(magicLinkURL.hash.length > 1);
        }
    });

    it("test emailExistsAPI", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
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
            // email does not exist
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
        }

        {
            // email exists

            // create a passwordless user through email
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            await Passwordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                linkCode: codeInfo.linkCode,
            });

            let emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
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
            assert(emailExistsResponse.status === "OK");
            assert(emailExistsResponse.exists === true);
        }
    });

    it("test emailExistsAPI with new path", async function () {
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
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
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
            // email does not exist
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/email/exists")
                    .query({
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
        }

        {
            // email exists

            // create a passwordless user through email
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            await Passwordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                linkCode: codeInfo.linkCode,
            });

            let emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/email/exists")
                    .query({
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
            assert(emailExistsResponse.status === "OK");
            assert(emailExistsResponse.exists === true);
        }
    });

    it("test phoneNumberExistsAPI", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
            // phoneNumber does not exist
            let phoneNumberDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/phonenumber/exists")
                    .query({
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
            assert(phoneNumberDoesNotExistResponse.status === "OK");
            assert(phoneNumberDoesNotExistResponse.exists === false);
        }

        {
            // phoneNumber exists

            // create a passwordless user through phone
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                phoneNumber: "+1234567890",
            });

            await Passwordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                linkCode: codeInfo.linkCode,
            });

            let phoneNumberExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/phonenumber/exists")
                    .query({
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
            assert(phoneNumberExistsResponse.status === "OK");
            assert(phoneNumberExistsResponse.exists === true);
        }
    });

    it("test phoneNumberExistsAPI with new path", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
            // phoneNumber does not exist
            let phoneNumberDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/phonenumber/exists")
                    .query({
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
            assert(phoneNumberDoesNotExistResponse.status === "OK");
            assert(phoneNumberDoesNotExistResponse.exists === false);
        }

        {
            // phoneNumber exists

            // create a passwordless user through phone
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                phoneNumber: "+1234567890",
            });

            await Passwordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                linkCode: codeInfo.linkCode,
            });

            let phoneNumberExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/passwordless/phonenumber/exists")
                    .query({
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
            assert(phoneNumberExistsResponse.status === "OK");
            assert(phoneNumberExistsResponse.exists === true);
        }
    });

    //resendCode API

    it("test resendCodeAPI", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                phoneNumber: "+1234567890",
            });

            // valid response
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/resend")
                    .send({
                        deviceId: codeInfo.deviceId,
                        preAuthSessionId: codeInfo.preAuthSessionId,
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
        }

        {
            // invalid preAuthSessionId and deviceId
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/resend")
                    .send({
                        deviceId: "TU/52WOcktSv99zqaAZuWJG9BSoS0aRLfCbep8rFEwk=",
                        preAuthSessionId: "kFmkPQEAJtACiT2w/K8fndEuNm+XozJXSZSlWEr+iGs=",
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

            assert(response.status === "RESTART_FLOW_ERROR");
        }
    });

    // test that you create a code with PHONE in config, you then change the config to use EMAIL, you call resendCode API, it should return RESTART_FLOW_ERROR
    it("test resendCodeAPI when changing contact method", async function () {
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
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
            let codeInfo = await Passwordless.createCode({
                tenantId: "public",
                phoneNumber: "+1234567890",
            });

            await killAllST();
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
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: async (input) => {
                                    return;
                                },
                            },
                        },
                    }),
                ],
            });

            {
                // invalid preAuthSessionId and deviceId
                let response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/signinup/code/resend")
                        .send({
                            deviceId: codeInfo.deviceId,
                            preAuthSessionId: codeInfo.preAuthSessionId,
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

                assert(response.status === "RESTART_FLOW_ERROR");
            }
        }
    });

    it("test resend code from different tenant throws error", async function () {
        const connectionURI = await startSTWithMultitenancy();

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
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                isCreateAndSendCustomEmailCalled = true;
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

        await Multitenancy.createOrUpdateTenant("t1", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t2", { passwordlessEnabled: true });
        await Multitenancy.createOrUpdateTenant("t3", { passwordlessEnabled: true });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        // createCodeAPI with email
        let validCreateCodeResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/t1/signinup/code")
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
        assert(validCreateCodeResponse.status === "OK");
        assert(isCreateAndSendCustomEmailCalled);

        isCreateAndSendCustomEmailCalled = false;

        // resendCode API
        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/t2/signinup/code/resend")
                .send({
                    deviceId: validCreateCodeResponse.deviceId,
                    preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
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
        assert.strictEqual(response.status, "RESTART_FLOW_ERROR");
        assert.strictEqual(isCreateAndSendCustomEmailCalled, false);
    });
});

function checkConsumeResponse(validUserInputCodeResponse, { email, phoneNumber, isNew, isPrimary }) {
    assert.strictEqual(validUserInputCodeResponse.status, "OK");
    assert.strictEqual(validUserInputCodeResponse.createdNewRecipeUser, isNew);

    assert.strictEqual(typeof validUserInputCodeResponse.user.id, "string");
    assert.strictEqual(typeof validUserInputCodeResponse.user.timeJoined, "number");
    assert.strictEqual(validUserInputCodeResponse.user.isPrimaryUser, isPrimary);

    assert(validUserInputCodeResponse.user.emails instanceof Array);
    if (email !== undefined) {
        assert.strictEqual(validUserInputCodeResponse.user.emails.length, 1);
        assert.strictEqual(validUserInputCodeResponse.user.emails[0], email);
    } else {
        assert.strictEqual(validUserInputCodeResponse.user.emails.length, 0);
    }

    assert(validUserInputCodeResponse.user.phoneNumbers instanceof Array);
    if (phoneNumber !== undefined) {
        assert.strictEqual(validUserInputCodeResponse.user.phoneNumbers.length, 1);
        assert.strictEqual(validUserInputCodeResponse.user.phoneNumbers[0], phoneNumber);
    } else {
        assert.strictEqual(validUserInputCodeResponse.user.phoneNumbers.length, 0);
    }

    assert.strictEqual(validUserInputCodeResponse.user.thirdParty.length, 0);

    assert.strictEqual(validUserInputCodeResponse.user.loginMethods.length, 1);
    const loginMethod = {
        recipeId: "passwordless",
        recipeUserId: validUserInputCodeResponse.user.id,
        timeJoined: validUserInputCodeResponse.user.timeJoined,
        verified: true,
        tenantIds: ["public"],
    };
    if (email) {
        loginMethod.email = email;
    }
    if (phoneNumber) {
        loginMethod.phoneNumber = phoneNumber;
    }
    assert.deepStrictEqual(validUserInputCodeResponse.user.loginMethods, [loginMethod]);

    assert.strictEqual(Object.keys(validUserInputCodeResponse.user).length, 8);
    assert.strictEqual(Object.keys(validUserInputCodeResponse).length, 3);
}
