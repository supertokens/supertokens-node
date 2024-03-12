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
    signUPRequestEmptyJSON,
    signUPRequest,
    signUPRequestNoBody,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
const express = require("express");
const request = require("supertest");
let nock = require("nock");
const { response } = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let bodyParser = require("body-parser");

describe(`signinFeature: ${printPath("[test/thirdpartyemailpassword/signinFeature.test.js]")}`, function () {
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

    it("test that disable api, the default signinup API does not work", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: undefined,
                            };
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "google",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.status, 404);
    });

    it("test that disable api, the default signin API does not work", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignInPOST: undefined,
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 404);
    });

    it("test handlePostSignUpIn gets set correctly", async function () {
        const connectionURI = await startST();

        process.env.userId = "";
        process.env.loginType = "";

        assert.strictEqual(process.env.userId, "");
        assert.strictEqual(process.env.loginType, "");

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
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: async (input) => {
                                    let response = await oI.thirdPartySignInUpPOST(input);
                                    if (response.status === "OK") {
                                        process.env.userId = response.user.id;
                                        process.env.loginType = "thirdparty";
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").times(2).reply(200, {});

        let response1 = await request(app)
            .post("/auth/signinup")
            .send({
                thirdPartyId: "custom",
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                    redirectURIQueryParams: {
                        code: "abcdefghj",
                    },
                },
            });

        assert.strictEqual(process.env.userId, response1.body.user.id);
        assert.strictEqual(process.env.loginType, "thirdparty");
    });

    it("test singinAPI works when input is fine", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI works when input is fine and user has added JSON middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.json());
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI works when input is fine and user has added urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI works when input is fine and user has added both JSON and urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI works when input is fine and user has added bodyParser JSON middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(bodyParser.json());
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI works when input is fine and user has added bodyParser urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI works when input is fine and user has added both bodyParser JSON and bodyParser urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let signUpUserInfo = JSON.parse(response.text).user;

        let userInfo = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text).user);
                    }
                })
        );
        assert(userInfo.id === signUpUserInfo.id);
        assert(userInfo.email === signUpUserInfo.email);
    });

    it("test singinAPI with empty JSON and user has added JSON middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.json());
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestEmptyJSON(app);
        assert.strictEqual(JSON.parse(response.text).message, "Missing input param: formFields");
        assert(response.status === 400);
    });

    it("test singinAPI with empty JSON and user has added urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestEmptyJSON(app);
        assert(JSON.parse(response.text).message === "Missing input param: formFields");
        assert(response.status === 400);
    });

    it("test singinAPI with empty JSON and user has added both JSON and urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestEmptyJSON(app);
        assert.strictEqual(JSON.parse(response.text).message, "Missing input param: formFields");
        assert(response.status === 400);
    });

    it("test singinAPI with empty JSON and user has added both bodyParser JSON and bodyParser urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestEmptyJSON(app);
        assert.strictEqual(JSON.parse(response.text).message, "Missing input param: formFields");
        assert(response.status === 400);
    });

    it("test singinAPI with empty request body and user has added JSON middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.json());
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestNoBody(app);
        assert.strictEqual(JSON.parse(response.text).message, "Missing input param: formFields");
        assert(response.status === 400);
    });

    it("test singinAPI with empty request body and user has added urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestNoBody(app);
        assert.strictEqual(JSON.parse(response.text).message, "Missing input param: formFields");
        assert(response.status === 400);
    });

    it("test singinAPI with empty request body and user has added both JSON and urlencoded middleware", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequestNoBody(app);
        assert.strictEqual(JSON.parse(response.text).message, "Missing input param: formFields");
        assert(response.status === 400);
    });

    /*
    Setting the email value in form field as random@gmail.com causes the test to fail
    */
    // testing error gets corectly routed to sub-recipe
    it("test singinAPI throws an error when email does not match", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let signUpResponse = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(signUpResponse.text).status === "OK");
        assert(signUpResponse.status === 200);

        let invalidEmailResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "ran@gmail.com",
                        },
                    ],
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
        assert(invalidEmailResponse.status === "WRONG_CREDENTIALS_ERROR");
    });

    /*
    having the email start with "test" (requierment of the custom validator) will cause the test to fail
    */
    it("test custom email validators to sign up and make sure they are applied to sign in", async function () {
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
                ThirdPartyEmailPassword.init({
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                                validate: (value) => {
                                    if (value.startsWith("test")) {
                                        return undefined;
                                    }
                                    return "email does not start with test";
                                },
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let signUpResponse = await signUPRequest(app, "testrandom@gmail.com", "validpass123");

        assert(JSON.parse(signUpResponse.text).status === "OK");
        assert(signUpResponse.status === 200);

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                    }
                    resolve(JSON.parse(res.text));
                })
        );
        assert(response.status === "FIELD_ERROR");
        assert(response.formFields[0].error === "email does not start with test");
        assert(response.formFields[0].id === "email");
    });
});
