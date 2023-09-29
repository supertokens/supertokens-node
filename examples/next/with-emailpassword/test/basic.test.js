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

/*
 * Imports
 */

const assert = require("assert");
const puppeteer = require("puppeteer");
const {
    getTestEmail,
    setInputValues,
    submitForm,
    toggleSignInSignUp,
    waitForSTElement,
} = require("../../../../test/exampleTestHelpers");

const SuperTokensNode = require("supertokens-node");
const Session = require("supertokens-node/recipe/session");
const EmailPassword = require("supertokens-node/recipe/emailpassword");

// Run the tests in a DOM environment.
require("jsdom-global")();

let deployInfo;

if (process.env.TEST_DEPLOYED_VERSION) {
    deployInfo = require("../deployInfo.json");

    if (!deployInfo.deploy_url) {
        throw new Error("Deployment failed or json error. " + JSON.stringify(deployInfo));
    }
}

const apiDomain = deployInfo?.deploy_url ?? "http://localhost:3000";
const websiteDomain = deployInfo?.deploy_url ?? "http://localhost:3000";

SuperTokensNode.init({
    supertokens: {
        // We are running these tests without running a local ST instance
        connectionURI: "https://try.supertokens.com",
    },
    appInfo: {
        // These largely shouldn't matter except for creating links which we can change anyway
        apiDomain: apiDomain,
        websiteDomain: websiteDomain,
        appName: "testNode",
    },
    recipeList: [EmailPassword.init(), Session.init()],
});

describe("SuperTokens Example Basic tests", function () {
    let browser;
    let page;
    const email = getTestEmail();
    const testPW = "Str0ngP@ssw0rd";

    before(async function () {
        browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
        });
        page = await browser.newPage();
    });

    after(async function () {
        await browser.close();
    });

    describe("Email Password test", function () {
        it("Successful signup with credentials", async function () {
            await Promise.all([page.goto(websiteDomain)]);

            // redirected to /auth
            await toggleSignInSignUp(page);
            await setInputValues(page, [
                { name: "email", value: email },
                { name: "password", value: testPW },
            ]);
            await submitForm(page);
            await page.waitForNavigation();
            const userList = await SuperTokensNode.listUsersByAccountInfo("public", { email });
            const user = userList[0];
            const callApiBtn = await page.waitForSelector(".ProtectedHome_sessionButton__ihFAK");
            let setAlertContent;
            let alertContent = new Promise((res) => (setAlertContent = res));
            page.on("dialog", async (dialog) => {
                setAlertContent(dialog.message());
                await dialog.dismiss();
            });
            await callApiBtn.click();

            const alertText = await alertContent;
            const sessionInfo = JSON.parse(alertText.replace(/^Session Information:/, ""));
            assert.strictEqual(sessionInfo.userId, user.id);
        });
    });
});
