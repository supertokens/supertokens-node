const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../session");
let assert = require("assert");

describe(`Querier: ${printPath("[test/querier.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });
});
