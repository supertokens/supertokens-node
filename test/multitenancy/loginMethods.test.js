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
const { printPath, setupST, startSTWithMultitenancy, killAllST, cleanST } = require("../utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../../lib/build/querier");
let { ProcessState } = require("../../lib/build/processState");
const SuperTokens = require("../../");
const Multitenancy = require("../../recipe/multitenancy");
const EmailPassword = require("../../recipe/emailpassword");
const ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
const Passwordless = require("../../recipe/passwordless");
const MultifactorAuth = require("../../recipe/multifactorauth");
const Session = require("../../recipe/session");
let { middleware, errorHandler } = require("../../framework/express");

describe(`loginMethods: ${printPath("[test/multitenancy/loginMethods.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("with mfa not enabled", function () {
        it("should return firstFactors based on enabled recipes if no other configuration is available", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                ],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(
                new Set(response.body.firstFactors),
                new Set(["emailpassword", "otp-email", "link-email"])
            );
        });

        it("should return firstFactors based on enabled combination recipes if no other configuration is available", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    ThirdPartyEmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                ],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(
                new Set(response.body.firstFactors),
                new Set(["emailpassword", "thirdparty", "otp-email", "link-email"])
            );
        });

        it("should return from core config when configured in core", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    ThirdPartyEmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("public", {
                firstFactors: ["emailpassword"],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(new Set(response.body.firstFactors), new Set(["emailpassword"]));
        });
    });

    describe("with mfa enabled", function () {
        it("static config is filtered with enabled recipes", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                    MultifactorAuth.init({
                        firstFactors: ["emailpassword", "thirdparty", "otp-email", "otp-phone"],
                    }),
                    Session.init(),
                ],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(new Set(response.body.firstFactors), new Set(["otp-email"]));
        });

        it("core config is prioritised over static config and is filtered with enabled recipes in SDK", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                    MultifactorAuth.init({
                        firstFactors: ["emailpassword", "otp-email", "otp-phone"],
                    }),
                    Session.init(),
                ],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            await Multitenancy.createOrUpdateTenant("public", {
                firstFactors: ["emailpassword", "link-email", "link-phone"],
            });

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(new Set(response.body.firstFactors), new Set(["link-email"]));
        });

        it("static config is filtered with enabled recipes in core", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                    MultifactorAuth.init({
                        firstFactors: ["emailpassword", "link-email", "link-phone"],
                    }),
                    Session.init(),
                ],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            await Multitenancy.createOrUpdateTenant("public", {
                emailPasswordEnabled: false,
            });

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(new Set(response.body.firstFactors), new Set(["link-email"]));
        });

        it("static config is filtered with enabled recipes, but custom is allowed", async function () {
            const connectionURI = await startSTWithMultitenancy();
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
                    Passwordless.init({
                        contactMethod: "EMAIL",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    Multitenancy.init(),
                    MultifactorAuth.init({
                        firstFactors: ["emailpassword", "thirdparty", "otp-email", "otp-phone", "custom"],
                    }),
                    Session.init(),
                ],
            });

            const app = express();

            app.use(middleware());
            app.use(errorHandler());

            let response = await request(app).get("/auth/loginmethods").send();

            assert.deepEqual(new Set(response.body.firstFactors), new Set(["otp-email", "custom"]));
        });
    });
});
