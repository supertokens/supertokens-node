const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../session");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");

describe(`deviceDriverInfo: ${printPath("[test/deviceDriverInfo.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("driver info check for /session without frontendSDK", async function() {
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
});
