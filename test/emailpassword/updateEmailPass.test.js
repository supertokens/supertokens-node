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
    signUPRequest,
    createServerlessCacheForTesting,
} = require("../utils");
const { updateEmailOrPassword, signIn } = require("../../lib/build/recipe/emailpassword");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
const { removeServerlessCache } = require("../../lib/build/utils");

describe(`updateEmailPassTest: ${printPath("[test/emailpassword/updateEmailPass.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test getUsersOldestFirst", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const express = require("express");
        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        await signUPRequest(app, "test@gmail.com", "testPass123");

        let user = await signIn("test@gmail.com", "testPass123");

        await updateEmailOrPassword({
            userId: user.id,
            email: "test2@gmail.com",
            password: "testPass",
        });

        let user2 = await signIn("test2@gmail.com", "testPass");

        assert(user2.id === user.id);
    });
});
