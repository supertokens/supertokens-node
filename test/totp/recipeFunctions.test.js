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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Totp = require("../../recipe/totp");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
let { isCDIVersionCompatible } = require("../utils");
const { default: RecipeUserId } = require("../../lib/build/recipeUserId");
const OTPAuth = require("otpauth");

describe(`recipeFunctions: ${printPath("[test/totp/recipeFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test create device", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), Totp.init()],
        });

        const deviceRes = await Totp.createDevice("testUserId");

        assert.equal(Object.keys(deviceRes).length, 4);
        assert.equal(deviceRes.status, "OK");
        assert.equal(deviceRes.deviceName, "TOTP Device 0");
        assert(deviceRes.secret !== undefined);
        assert(deviceRes.qrCodeString !== undefined);
    });

    it("test update device", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), Totp.init()],
        });

        const deviceRes = await Totp.createDevice("testUserId");

        assert.equal(Object.keys(deviceRes).length, 4);
        assert.equal(deviceRes.status, "OK");
        assert.equal(deviceRes.deviceName, "TOTP Device 0");
        assert(deviceRes.secret !== undefined);
        assert(deviceRes.qrCodeString !== undefined);

        const updateRes = await Totp.updateDevice("testUserId", deviceRes.deviceName, "newDeviceName");
        assert.equal(updateRes.status, "OK");

        const listRes = await Totp.listDevices("testUserId");
        assert.equal(listRes.status, "OK");
        assert.equal(listRes.devices.length, 1);
        assert.equal(listRes.devices[0].deviceName, "newDeviceName");
    });

    it("test remove device", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), Totp.init()],
        });

        const deviceRes = await Totp.createDevice("testUserId");

        assert.equal(Object.keys(deviceRes).length, 4);
        assert.equal(deviceRes.status, "OK");
        assert.equal(deviceRes.deviceName, "TOTP Device 0");
        assert(deviceRes.secret !== undefined);
        assert(deviceRes.qrCodeString !== undefined);

        const updateRes = await Totp.removeDevice("testUserId", deviceRes.deviceName, "newDeviceName");
        assert.equal(updateRes.status, "OK");

        const listRes = await Totp.listDevices("testUserId");
        assert.equal(listRes.status, "OK");
        assert.equal(listRes.devices.length, 0);
    });

    it("test verify device", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), Totp.init()],
        });

        const deviceRes = await Totp.createDevice("testUserId");

        assert.equal(Object.keys(deviceRes).length, 4);
        assert.equal(deviceRes.status, "OK");
        assert.equal(deviceRes.deviceName, "TOTP Device 0");
        assert(deviceRes.secret !== undefined);
        assert(deviceRes.qrCodeString !== undefined);

        const otp = new OTPAuth.TOTP({
            digits: 6,
            period: 30,
            secret: deviceRes.secret,
        }).generate();
        const verifyRes = await Totp.verifyDevice("public", "testUserId", deviceRes.deviceName, otp);
        assert.equal(verifyRes.status, "OK");
        assert.equal(verifyRes.wasAlreadyVerified, false);

        const listRes = await Totp.listDevices("testUserId");
        assert.equal(listRes.status, "OK");
        assert.equal(listRes.devices.length, 1);
        assert.equal(listRes.devices[0].verified, true);
    });

    it("test verify totp", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), Totp.init()],
        });

        const deviceRes = await Totp.createDevice("testUserId");

        assert.equal(Object.keys(deviceRes).length, 4);
        assert.equal(deviceRes.status, "OK");
        assert.equal(deviceRes.deviceName, "TOTP Device 0");
        assert(deviceRes.secret !== undefined);
        assert(deviceRes.qrCodeString !== undefined);

        let otp = new OTPAuth.TOTP({
            digits: 6,
            period: 30,
            secret: deviceRes.secret,
        }).generate();
        const verifyRes = await Totp.verifyDevice("public", "testUserId", deviceRes.deviceName, otp);
        assert.equal(verifyRes.status, "OK");
        assert.equal(verifyRes.wasAlreadyVerified, false);

        const listRes = await Totp.listDevices("testUserId");
        assert.equal(listRes.status, "OK");
        assert.equal(listRes.devices.length, 1);
        assert.equal(listRes.devices[0].verified, true);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await delay(30000); // wait for new code

        otp = new OTPAuth.TOTP({
            digits: 6,
            period: 30,
            secret: deviceRes.secret,
        }).generate();

        const verifyTotpRes = await Totp.verifyTOTP("public", "testUserId", otp);
        assert.equal(verifyTotpRes.status, "OK");
    });
});
