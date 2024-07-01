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
    signInUPCustomRequest,
    extractInfoFromResponse,
    emailVerifyTokenRequest,
    isCDIVersionCompatible,
    delay,
} = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const EmailVerification = require("../../recipe/emailverification");
const ThirdParty = require("../../recipe/thirdparty");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");
let supertest = require("supertest");
let nock = require("nock");

describe(`emailverify: ${printPath("[test/thirdparty/emailverify.test.js]")}`, function () {
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
                    getUserInfo: async function ({ oAuthTokens }) {
                        return {
                            thirdPartyUserId: oAuthTokens.id,
                            email: {
                                id: oAuthTokens.email,
                                isVerified: false,
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

    it("test default backward compatibility api being called: email verify", async function () {
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
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
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
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", STExpress.convertToRecipeUserId(req.body.id), {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "supertokens",
            "test-user-id",
            "test@example.com",
            false
        );
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        let appName = undefined;
        let email = undefined;
        let emailVerifyURL = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/email/verify")
            .reply(200, (uri, body) => {
                appName = body.appName;
                email = body.email;
                emailVerifyURL = body.emailVerifyURL;
                return {};
            });

        process.env.TEST_MODE = "production";

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test default backward compatibility api being called, error message not sent back to user: email verify", async function () {
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
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
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
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", STExpress.convertToRecipeUserId(req.body.id), {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "supertokens",
            "test-user-id",
            "test@example.com",
            false
        );
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        let appName = undefined;
        let email = undefined;
        let emailVerifyURL = undefined;

        nock("https://api.supertokens.io")
            .post("/0/st/auth/email/verify")
            .reply(500, (uri, body) => {
                appName = body.appName;
                email = body.email;
                emailVerifyURL = body.emailVerifyURL;
                return {};
            });

        process.env.TEST_MODE = "production";

        let result = await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        process.env.TEST_MODE = "testing";

        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(email, "test@example.com");
        assert.notStrictEqual(emailVerifyURL, undefined);
        assert.strictEqual(result.body.status, "OK");
    });

    it("test custom override: email verify", async function () {
        const connectionURI = await startST();
        let email = undefined;
        let emailVerifyURL = undefined;
        let type = undefined;
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                sendEmail: async (input) => {
                                    email = input.user.email;
                                    emailVerifyURL = input.emailVerifyLink;
                                    type = input.type;
                                    await oI.sendEmail(input);
                                },
                            };
                        },
                    },
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
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
        app.post("/create", async (req, res) => {
            await Session.createNewSession(req, res, "public", STExpress.convertToRecipeUserId(req.body.id), {}, {});
            res.status(200).send("");
        });
        app.use(errorHandler());

        let user = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "supertokens",
            "test-user-id",
            "test@example.com",
            false
        );
        let res = extractInfoFromResponse(await supertest(app).post("/create").send({ id: user.user.id }).expect(200));

        process.env.TEST_MODE = "production";

        nock("https://api.supertokens.io")
            .post("/0/st/auth/email/verify")
            .reply(200, (uri, body) => {
                appName = body.appName;
                return {};
            });

        await supertest(app)
            .post("/auth/user/email/verify/token")
            .set("rid", "emailverification")
            .set("Cookie", ["sAccessToken=" + res.accessToken])
            .expect(200);

        process.env.TEST_MODE = "testing";

        await delay(2);
        assert.strictEqual(email, "test@example.com");
        assert.strictEqual(appName, "SuperTokens");
        assert.strictEqual(type, "EMAIL_VERIFICATION");
        assert.notStrictEqual(emailVerifyURL, undefined);
    });

    it("test that providing your own email callback and make sure it is called", async function () {
        const connectionURI = await startST();

        let userInfo = null;
        let emailToken = null;

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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                userInfo = input.user;
                                emailToken = input.emailVerifyLink;
                            },
                        },
                    },
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signInUPCustomRequest(app, "test@gmail.com", "testPass0");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        let response2 = await emailVerifyTokenRequest(
            app,
            infoFromResponse.accessToken,
            infoFromResponse.antiCsrf,
            userId
        );

        assert(response2.status === 200);

        assert(JSON.parse(response2.text).status === "OK");
        assert(Object.keys(JSON.parse(response2.text)).length === 1);

        assert(userInfo.id === userId);
        assert(userInfo.email === "test@gmail.com");
        assert(emailToken !== null);
    });
});
