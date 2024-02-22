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
let SuperTokens = require("../../");
let Multitenancy = require("../../recipe/multitenancy");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdPartyEmaillPassword = require("../../recipe/thirdpartyemailpassword");
let Passwordless = require("../../recipe/passwordless");
let MultifactorAuth = require("../../recipe/multifactorauth");
let Session = require("../../recipe/session");
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

    it("test without mfa - case 1", async function () {
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/loginmethods")
                .send()
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepEqual(response.body.firstFactors, ["emailpassword", "otp-email", "link-email"]);
    });

    it("test without mfa - case 2", async function () {
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
                ThirdPartyEmaillPassword.init(),
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/loginmethods")
                .send()
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepEqual(response.body.firstFactors, ["emailpassword", "thirdparty", "otp-email", "link-email"]);
    });

    it("test with mfa - static config is filtered with enabled recipes", async function () {
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/loginmethods")
                .send()
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepEqual(response.body.firstFactors, ["otp-email"]);
    });

    it("test with mfa - core config is prioritised over static config and is filtered with enabled recipes", async function () {
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/loginmethods")
                .send()
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepEqual(response.body.firstFactors, ["link-email"]);
    });

    it("test with mfa - static config is filtered with enabled recipes in core", async function () {
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/loginmethods")
                .send()
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepEqual(response.body.firstFactors, ["link-email"]);
    });

    it("test with mfa - static config is filtered with enabled recipes, but custom is allowed", async function () {
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

        let response = await new Promise((resolve) =>
            request(app)
                .get("/auth/loginmethods")
                .send()
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepEqual(response.body.firstFactors, ["otp-email", "custom"]);
    });
});
