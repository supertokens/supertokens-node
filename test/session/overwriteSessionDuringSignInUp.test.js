/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse, resetAll } = require("../utils");
const assert = require("assert");
const { Querier } = require("../../lib/build/querier");
const express = require("express");
const request = require("supertest");
const { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
const SuperTokens = require("../../");
const Session = require("../../recipe/session");
const EmailPassword = require("../../recipe/emailpassword");
const { middleware, errorHandler } = require("../../framework/express");
const { json } = require("body-parser");

describe(`overwriteSessionDuringSignInUp config: ${printPath(
    "[test/session/overwriteSessionDuringSignInUp.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewSession", () => {
        it("test default", async function () {
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
                recipeList: [EmailPassword.init(), Session.init({})],
            });

            const app = getTestExpressApp();

            await EmailPassword.signUp("public", "test@example.com", "password");
            await EmailPassword.signUp("public", "test2@example.com", "password");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "password",
                            },
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);

            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            let accessToken = cookies.accessTokenFromAny;

            res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .set("Authorization", "Bearer " + accessToken)
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "password",
                            },
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny === undefined);
        });

        it("test false", async function () {
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
                recipeList: [EmailPassword.init(), Session.init({ overwriteSessionDuringSignInUp: false })],
            });

            const app = getTestExpressApp();

            await EmailPassword.signUp("public", "test@example.com", "password");
            await EmailPassword.signUp("public", "test2@example.com", "password");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "password",
                            },
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);

            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            let accessToken = cookies.accessTokenFromAny;

            res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .set("Authorization", "Bearer " + accessToken)
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "password",
                            },
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny === undefined);
        });

        it("test true", async function () {
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
                recipeList: [EmailPassword.init(), Session.init({ overwriteSessionDuringSignInUp: true })],
            });

            const app = getTestExpressApp();

            await EmailPassword.signUp("public", "test@example.com", "password");
            await EmailPassword.signUp("public", "test2@example.com", "password");

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "password",
                            },
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);

            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            let accessToken = cookies.accessTokenFromAny;

            res = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .set("Authorization", "Bearer " + accessToken)
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "password",
                            },
                            {
                                id: "email",
                                value: "test2@example.com",
                            },
                        ],
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            cookies = extractInfoFromResponse(res);
            assert.notStrictEqual(cookies.accessTokenFromAny, undefined);
        });
    });
});

function getTestExpressApp() {
    const app = express();

    app.use(middleware());
    app.use(json());

    app.post("/create", async (req, res) => {
        const userId = req.body.userId || "";
        try {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId(userId),
                req.body.payload,
                {},
                false // alwaysOverwriteSessionInRequest
            );
            res.status(200).send("");
        } catch (ex) {
            res.status(400).json({ message: ex.message });
        }
    });

    app.use(errorHandler());
    return app;
}
