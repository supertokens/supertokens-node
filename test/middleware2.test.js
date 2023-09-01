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
    setKeyValueInConfig,
    extractInfoFromResponse,
} = require("./utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let EmailPassword = require("../recipe/emailpassword");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let { middleware, errorHandler } = require("../framework/express");
let { verifySession } = require("../recipe/session/framework/express");

describe(`middleware2: ${printPath("[test/middleware2.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test rid with session and non existant API in session recipe gives 404", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), EmailPassword.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("rid", "session")
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

    it("test no rid with existent API does not give 404", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), EmailPassword.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 400);
    });

    it("test rid as anti-csrf with existent API does not give 404", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), EmailPassword.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("rid", "anti-csrf")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 400);
    });

    it("test random rid with existent API gives 404", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), EmailPassword.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("rid", "random")
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

    it("custom response express", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
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
                                emailExistsGET: async function (input) {
                                    const res = await oI.emailExistsGET(input);
                                    input.options.res.setStatusCode(201);
                                    input.options.res.sendJSONResponse({
                                        custom: true,
                                    });
                                    return res;
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/signup/email/exists?email=test@example.com")
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(response.body.custom);
    });
});
