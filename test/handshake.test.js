const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");

describe(`Handshake: ${printPath("[test/handshake.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("ST start stop", async function() {
        let pid = await startST("localhost", 8081);
        let pid2 = await startST("localhost", 8080);
        await stopST(pid);
        await stopST(pid2);
    });
});
