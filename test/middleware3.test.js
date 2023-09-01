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
let Dashboard = require("../recipe/dashboard");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let { middleware, errorHandler } = require("../framework/express");
let { verifySession } = require("../recipe/session/framework/express");

describe(`middleware3: ${printPath("[test/middleware3.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test APIs work with tenantId in the request", async function () {
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
                .post("/auth/public/signup")
                .set("st-auth-mode", "cookie")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "password1",
                        },
                        {
                            id: "email",
                            value: "test@example.com",
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
        assert(response.status == 200);
        assert(response.body.status === "OK");
    });

    it("test Dashboard APIs match with tenantId", async function () {
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
                EmailPassword.init(),
                Dashboard.init(),
            ],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/public/dashboard/api/signin")
                .send({
                    email: "test@example.com",
                    password: "password1",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(response.status == 200);
    });
});
