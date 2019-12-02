const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../session");
let { Querier } = require("../lib/build/querier");

describe(`Querier: ${printPath("[test/querier.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("querier called without init", async function() {
        try {
            Querier.getInstance();
            throw new Error();
        } catch (err) {
            if (
                !ST.Error.isErrorFromAuth(err) ||
                err.errType !== ST.Error.GENERAL_ERROR ||
                err.err.message !==
                    "Please call the init function before using any other functions of the SuperTokens library"
            ) {
                throw err;
            }
        }
    });

    it("core not available", async function() {
        ST.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        try {
            let q = Querier.getInstance();
            await q.sendGetRequest("/", {});
            throw new Error();
        } catch (err) {
            if (
                !ST.Error.isErrorFromAuth(err) ||
                err.errType !== ST.Error.GENERAL_ERROR ||
                err.err.message !== "No SuperTokens core available to query"
            ) {
                throw err;
            }
        }
    });

    it("three cores and round robin", async function() {
        // TODO:
    });

    it("three cores, one dead and round robin", async function() {
        // TODO:
    });
});
