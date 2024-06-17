let assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
let OAuth2Recipe = require("../../recipe/oauth2");
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`OAuth2ClientTests: ${printPath("[test/oauth2/oauth2client.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("should create an OAuth2Client instance with empty input", async function () {
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
            recipeList: [OAuth2Recipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        const { client } = await OAuth2Recipe.createOAuth2Client({}, {});

        assert(client.clientId !== undefined);
        assert(client.clientSecret !== undefined);
        assert.strictEqual(client.scope, "offline_access offline openid");
    });

    it("should create an OAuth2Client instance with custom input", async function () {
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
            recipeList: [OAuth2Recipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        const { client } = await OAuth2Recipe.createOAuth2Client(
            {
                client_id: "client_id",
                client_secret: "client_secret",
            },
            {}
        );

        assert(client.clientId === "client_id");
        assert(client.clientSecret === "client_secret");
    });
});
