const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../session");
let STExpress = require("../index");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");

describe(`deviceDriverInfo: ${printPath("[test/deviceDriverInfo.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("driver info check for /session without frontendSDKs", async function() {
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

    it("driver info check for /session/verify with frontendSDKs", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
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
        let res = await new Promise(resolve =>
            request(app)
                .post("/create")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        // TODO: extract relevant info and then send that to /session/verify request and check if deviceInfo is being saved or not.
    });
});
