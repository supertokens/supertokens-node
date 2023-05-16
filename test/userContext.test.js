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
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
} = require("./utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let SuperTokens = require("..");
let Session = require("../recipe/session");
let EmailPassword = require("../recipe/emailpassword");
let { Querier } = require("../lib/build/querier");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
const { verifySession } = require("../recipe/session/framework/express");
const { default: next } = require("next");
let { middleware, errorHandler } = require("../framework/express");
let STExpress = require("../");

describe(`userContext: ${printPath("[test/userContext.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("testing context across interface and recipe function", async function () {
        await startST();
        let works = false;
        let signUpContextWorks = false;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                signUp: async function (input) {
                                    if (input.userContext.manualCall) {
                                        signUpContextWorks = true;
                                    }
                                    return oI.signUp(input);
                                },
                                signIn: async function (input) {
                                    if (input.userContext.preSignInPOST) {
                                        input.userContext.preSignIn = true;
                                    }

                                    let resp = await oI.signIn(input);

                                    if (input.userContext.preSignInPOST && input.userContext.preSignIn) {
                                        input.userContext.postSignIn = true;
                                    }
                                    return resp;
                                },
                            };
                        },
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInPOST: async function (input) {
                                    input.userContext = {
                                        preSignInPOST: true,
                                    };

                                    let resp = await oI.signInPOST(input);

                                    if (
                                        input.userContext.preSignInPOST &&
                                        input.userContext.preSignIn &&
                                        input.userContext.preCreateNewSession &&
                                        input.userContext.postCreateNewSession &&
                                        input.userContext.postSignIn
                                    ) {
                                        works = true;
                                    }
                                    return resp;
                                },
                            };
                        },
                    },
                }),
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async function (input) {
                                    if (
                                        input.userContext.preSignInPOST &&
                                        input.userContext.preSignIn &&
                                        input.userContext.postSignIn
                                    ) {
                                        input.userContext.preCreateNewSession = true;
                                    }

                                    let resp = oI.createNewSession(input);

                                    if (
                                        input.userContext.preSignInPOST &&
                                        input.userContext.preSignIn &&
                                        input.userContext.preCreateNewSession &&
                                        input.userContext.postSignIn
                                    ) {
                                        input.userContext.postCreateNewSession = true;
                                    }

                                    return resp;
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

        await EmailPassword.signUp("random@gmail.com", "validpass123", {
            manualCall: true,
        });

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
        assert(response.status === 200);
        assert(works);
        assert(signUpContextWorks);
    });

    it("testing default context across interface and recipe function", async function () {
        await startST();
        let signInContextWorks = false;
        let signInAPIContextWorks = false;
        let createNewSessionContextWorks = false;

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                signIn: async function (input) {
                                    if (input.userContext._default && input.userContext._default.request) {
                                        signInContextWorks = true;
                                    }

                                    return await oI.signIn(input);
                                },
                            };
                        },
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInPOST: async function (input) {
                                    if (input.userContext._default && input.userContext._default.request) {
                                        signInAPIContextWorks = true;
                                    }

                                    return await oI.signInPOST(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async function (input) {
                                    if (input.userContext._default && input.userContext._default.request) {
                                        createNewSessionContextWorks = true;
                                    }

                                    return await oI.createNewSession(input);
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

        await EmailPassword.signUp("random@gmail.com", "validpass123", {
            manualCall: true,
        });

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
        assert(response.status === 200);
        assert(signInContextWorks);
        assert(signInAPIContextWorks);
        assert(createNewSessionContextWorks);
    });
});
