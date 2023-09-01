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
const { printPath, setupST, startST, stopST, killAllST, cleanST, signUPRequest } = require("../utils");
const { updateEmailOrPassword, signIn } = require("../../lib/build/recipe/emailpassword");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let { middleware, errorHandler } = require("../../framework/express");
const express = require("express");

describe(`updateEmailPassTest: ${printPath("[test/emailpassword/updateEmailPass.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test updateEmailPass", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test@gmail.com", "testPass123");

        let res = await signIn("public", "test@gmail.com", "testPass123");

        await updateEmailOrPassword({
            recipeUserId: STExpress.convertToRecipeUserId(res.user.id),
            email: "test2@gmail.com",
            password: "testPass",
            applyPasswordPolicy: false,
        });

        let res2 = await signIn("public", "test2@gmail.com", "testPass");

        assert(res2.user.id === res2.user.id);
    });

    it("test updateEmailPass with failing password validation", async function () {
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
                EmailPassword.init({
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                            },
                            {
                                id: "password",
                                validate: async (value) => {
                                    if (value.length < 5) return "Password should be greater than 5 characters";
                                    return undefined;
                                },
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test@gmail.com", "testPass123");

        let res = await signIn("public", "test@gmail.com", "testPass123");

        const res2 = await updateEmailOrPassword({
            userId: STExpress.convertToRecipeUserId(res.user.id),
            email: "test2@gmail.com",
            password: "test",
        });

        assert(res2.status === "PASSWORD_POLICY_VIOLATED_ERROR");
        assert(res2.failureReason === "Password should be greater than 5 characters");
    });

    it("test updateEmailPass with passing password validation", async function () {
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
                EmailPassword.init({
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                            },
                            {
                                id: "password",
                                validate: async (value) => {
                                    if (value.length < 5) return "Password should be greater than 5 characters";
                                    return undefined;
                                },
                            },
                        ],
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test@gmail.com", "testPass123");

        let res = await signIn("public", "test@gmail.com", "testPass123");

        const res2 = await updateEmailOrPassword({
            recipeUserId: STExpress.convertToRecipeUserId(res.user.id),
            email: "test2@gmail.com",
            password: "testPass2",
        });

        assert(res2.status === "OK");
    });

    it("test updateEmailPass with failing default password validation", async function () {
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        const express = require("express");
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await signUPRequest(app, "test@gmail.com", "testPass123");

        let res = await signIn("public", "test@gmail.com", "testPass123");

        const res2 = await updateEmailOrPassword({
            userId: STExpress.convertToRecipeUserId(res.user.id),
            email: "test2@gmail.com",
            password: "1",
        });

        assert(res2.status === "PASSWORD_POLICY_VIOLATED_ERROR");
        assert(res2.failureReason === "Password must contain at least 8 characters, including a number");
    });
});
