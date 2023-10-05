const { printPath, setupST, startST, killAllST, cleanST, resetAll } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Totp = require("../../recipe/totp");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const { authenticator } = require("otplib");

describe(`totp: ${printPath("[test/totp/recipe.test.js]")}`, function () {
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
            recipeList: [Session.init(), Totp.init()],
        });

        let response = await Totp.createDevice({
            userId: "userId",
        });

        assert.strictEqual(response.status, "OK");
        assert(response.secret !== undefined);
        assert.strictEqual(response.deviceName, "TOTP Device 0");

        response = await Totp.createDevice({
            userId: "userId",
            deviceName: "phone",
        });

        assert.strictEqual(response.status, "OK");
        assert(response.secret !== undefined);
        assert.strictEqual(response.deviceName, "phone");
    });

    it("test list devices", async function () {
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
            recipeList: [Session.init(), Totp.init()],
        });

        let devices = await Totp.listDevices({ userId: "userId" });
        assert.strictEqual(devices.devices.length, 0);

        let response = await Totp.createDevice({
            userId: "userId",
        });

        devices = await Totp.listDevices({ userId: "userId" });
        assert.strictEqual(devices.devices.length, 1);
        assert.strictEqual(devices.devices[0].verified, false);

        await Totp.removeDevice({ userId: "userId", deviceName: response.deviceName });

        devices = await Totp.listDevices({ userId: "userId" });
        assert.strictEqual(devices.devices.length, 0);
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
            recipeList: [Session.init(), Totp.init()],
        });

        let response = await Totp.createDevice({
            userId: "userId",
        });
        const validOtp = authenticator.generate(response.secret);

        const resp = await Totp.verifyDevice({
            userId: "userId",
            deviceName: response.deviceName,
            totp: validOtp,
        });

        assert.strictEqual(resp.status, "OK");
        assert.strictEqual(resp.wasAlreadyVerified, false);
    });
});
