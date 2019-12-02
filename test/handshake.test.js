const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let ST = require("../session");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let assert = require("assert");

describe(`Handshake: ${printPath("[test/handshake.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("core not available", async function() {
        ST.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        try {
            await ST.createNewSession("", {}, {});
            throw new Error("should not have come here");
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

    it("successful handshake and update JWT", async function() {
        await startST();
        ST.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        let info = await HandshakeInfo.getInstance();
        assert.equal(info.accessTokenPath, "/");
        assert.equal(info.cookieDomain, "supertokens.io");
        assert.equal(typeof info.jwtSigningPublicKey, "string");
        assert.equal(info.cookieSecure, true);
        assert.equal(info.refreshTokenPath, "/refresh");
        assert.equal(info.enableAntiCsrf, true);
        assert.equal(info.accessTokenBlacklistingEnabled, false);
        assert.equal(typeof info.jwtSigningPublicKeyExpiryTime, "number");
        info.updateJwtSigningPublicKeyInfo("hello", 100);
        let info2 = await HandshakeInfo.getInstance();
        assert.equal(info2.jwtSigningPublicKey, "hello");
        assert.equal(info2.jwtSigningPublicKeyExpiryTime, 100);
    });
});
