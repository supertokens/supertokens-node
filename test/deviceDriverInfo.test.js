const { printPath, setupST, startST, stopST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let ST = require("../session");
let STExpress = require("../index");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");

// TODO: test with existing header params being there and that the lib appends to those and not overrides those

describe(`deviceDriverInfo: ${printPath("[test/deviceDriverInfo.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("driver info check without frontendSDKs", async function() {
        await startST();
        const scope = nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session")
            .reply((uri, rb) => {
                let success = false;
                try {
                    let ddi = rb.deviceDriverInfo;
                    if (
                        ddi !== undefined &&
                        ddi.frontendSDK.length === 0 &&
                        ddi.driver.name === "node" &&
                        ddi.driver.version === version
                    ) {
                        success = true;
                    }
                } catch (err) {}
                return [200, { success: success }];
            });
        ST.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        let response = await ST.createNewSession("", {}, {});
        assert.equal(response.success, true);
    });

    it("driver info check with frontendSDKs", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        // server.
        let server;
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await STExpress.getSession(req, res, true);
            res.status(200).send("");
        });

        app.post("/session/refresh", async (req, res) => {
            await STExpress.refreshSession(req, res);
            res.status(200).send("");
        });

        // calling server..
        let res = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        await new Promise(resolve =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
                .set("anti-csrf", res.antiCsrf)
                .set("supertokens-sdk-name", "ios")
                .set("supertokens-sdk-version", "0.0.0")
                .end((err, res) => {
                    resolve();
                })
        );

        // with no frontend SDK headers.
        await new Promise(resolve =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        await new Promise(resolve =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .set("supertokens-sdk-name", "android")
                .set("supertokens-sdk-version", "0.0.1")
                .end((err, res) => {
                    resolve();
                })
        );

        // mocking ST service
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [{ name: "ios", version: "0.0.0" }, { name: "android", version: "0.0.1" }],
                        driver: { name: "node", version: "0.0.1" }
                    });
                    return [200, { success: true }];
                } catch (err) {}
                return [200, { success: false }];
            });
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session/verify")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [{ name: "ios", version: "0.0.0" }, { name: "android", version: "0.0.1" }],
                        driver: { name: "node", version: "0.0.1" }
                    });
                    return [
                        200,
                        { status: "OK", jwtSigningPublicKey: "", jwtSigningPublicKeyExpiryTime: 0, success: true }
                    ];
                } catch (err) {}
                return [200, { success: false }];
            });
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session/refresh")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [{ name: "ios", version: "0.0.0" }, { name: "android", version: "0.0.1" }],
                        driver: { name: "node", version: "0.0.1" }
                    });
                    return [200, { success: true, status: "OK" }];
                } catch (err) {}
                return [200, { success: false }];
            });
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/handshake")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [{ name: "ios", version: "0.0.0" }, { name: "android", version: "0.0.1" }],
                        driver: { name: "node", version: "0.0.1" }
                    });
                    return [200, { jwtSigningPublicKey: "true" }];
                } catch (err) {}
                return [200, { jwtSigningPublicKey: "false" }];
            });
        assert.deepEqual(await ST.createNewSession("", {}, {}), { success: true });
        assert.deepEqual(await ST.getSession("", "", false), { success: true });
        assert.deepEqual(await ST.refreshSession(""), { success: true });
        HandshakeInfo.reset();
        assert.equal((await HandshakeInfo.getInstance()).jwtSigningPublicKey, "true");
    });

    it("options API", async function() {
        // TODO:
    });
});
