/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, createCoreApplication } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let MultiFactorAuth = require("../../recipe/multifactorauth");
let Totp = require("../../recipe/totp");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const OTPAuth = require("otpauth");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

describe(`totp removeDevicePOST: ${printPath("[test/totp/removeDevice.test.js]")}`, function () {
    let removeDeviceCalls;

    beforeEach(async function () {
        ProcessState.getInstance().reset();
        removeDeviceCalls = [];

        const connectionURI = await createCoreApplication();
        STExpress.init({
            supertokens: { connectionURI },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "header" }),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword"],
                    override: {
                        functions: (oI) => ({
                            ...oI,
                            getMFARequirementsForAuth: async () => ["totp"],
                        }),
                    },
                }),
                Totp.init({
                    override: {
                        functions: (oI) => ({
                            ...oI,
                            removeDevice: async (input) => {
                                removeDeviceCalls.push(input.deviceName);
                                return oI.removeDevice(input);
                            },
                        }),
                    },
                }),
            ],
        });
    });

    function getApp() {
        const app = express();
        app.use(middleware());
        app.use(errorHandler());
        return app;
    }

    async function createUser() {
        const signUpRes = await EmailPassword.signUp("public", "user@example.com", "password123");
        assert.strictEqual(signUpRes.status, "OK");
        return signUpRes.user;
    }

    async function createDevice(userId, deviceName, { verified }) {
        const deviceRes = await Totp.createDevice(userId, "user@example.com", deviceName);
        assert.strictEqual(deviceRes.status, "OK");
        if (verified) {
            const otp = new OTPAuth.TOTP({ digits: 6, period: 30, secret: deviceRes.secret }).generate();
            const verifyRes = await Totp.verifyDevice("public", userId, deviceName, otp);
            assert.strictEqual(verifyRes.status, "OK");
        }
    }

    async function getAccessToken(user, { completeTotp = false } = {}) {
        const session = await Session.createNewSessionWithoutRequestResponse(
            "public",
            user.loginMethods[0].recipeUserId
        );
        if (completeTotp) {
            await MultiFactorAuth.markFactorAsCompleteInSession(session, "totp");
        }
        return session.getAllSessionTokensDangerously().accessToken;
    }

    function removeDevice(accessToken, deviceName) {
        return request(getApp())
            .post("/auth/totp/device/remove")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ deviceName });
    }

    function assertMFARequired(res) {
        assert.strictEqual(res.status, 403, JSON.stringify(res.body));
        assert.strictEqual(res.body.message, "invalid claim");
        assert.strictEqual(res.body.claimValidationErrors[0].id, "st-mfa");
        assert.deepStrictEqual(removeDeviceCalls, []);
    }

    it("requires MFA to remove a verified device using a different case of its name", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        const accessToken = await getAccessToken(user);

        assertMFARequired(await removeDevice(accessToken, "phone"));
    });

    it("requires MFA to remove a verified device using a compatibility variant of its name", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        const accessToken = await getAccessToken(user);

        // fullwidth "Ｐｈｏｎｅ" is equal to "Phone" after NFKC normalisation
        assertMFARequired(await removeDevice(accessToken, "Ｐｈｏｎｅ"));
    });

    it("requires MFA to remove a device that does not exist if the user has a verified device", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        const accessToken = await getAccessToken(user);

        assertMFARequired(await removeDevice(accessToken, "Tablet"));
    });

    it("requires MFA to remove an unverified device whose name matches a verified device case-insensitively", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        await createDevice(user.id, "PHONE", { verified: false });
        const accessToken = await getAccessToken(user);

        assertMFARequired(await removeDevice(accessToken, "PHONE"));
    });

    it("requires MFA to remove a verified device using its exact name", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        const accessToken = await getAccessToken(user);

        assertMFARequired(await removeDevice(accessToken, "Phone"));
    });

    it("removes a lone unverified device without MFA", async function () {
        const user = await createUser();
        await createDevice(user.id, "Pending", { verified: false });
        const accessToken = await getAccessToken(user);

        const res = await removeDevice(accessToken, "Pending");

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.didDeviceExist, true);
        assert.deepStrictEqual(removeDeviceCalls, ["Pending"]);
    });

    it("removes an unverified device without MFA if no verified device matches its name", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        await createDevice(user.id, "Pending", { verified: false });
        const accessToken = await getAccessToken(user);

        const res = await removeDevice(accessToken, "Pending");

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.deepStrictEqual(removeDeviceCalls, ["Pending"]);
    });

    it("removes a verified device with MFA completed", async function () {
        const user = await createUser();
        await createDevice(user.id, "Phone", { verified: true });
        const accessToken = await getAccessToken(user, { completeTotp: true });

        const res = await removeDevice(accessToken, "Phone");

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.didDeviceExist, true);
        assert.deepStrictEqual(removeDeviceCalls, ["Phone"]);
    });
});
