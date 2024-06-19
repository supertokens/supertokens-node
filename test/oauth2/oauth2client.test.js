let assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
let OAuth2Recipe = require("../../recipe/oauth2");

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

        const { client } = await OAuth2Recipe.createOAuth2Client(
            {
                client_id: "client_id",
                client_secret: "client_secret",
            },
            {}
        );

        assert.strictEqual(client.clientId, "client_id");
        assert.strictEqual(client.clientSecret, "client_secret");
    });

    it("should update the OAuth2Client", async function () {
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

        // Create a client
        const { client } = await OAuth2Recipe.createOAuth2Client(
            {
                client_id: "client_id",
                client_secret: "client_secret",
                scope: "offline_access offline",
                redirectUris: ["http://localhost:3000"],
            },
            {}
        );

        assert.strictEqual(client.clientId, "client_id");
        assert.strictEqual(client.clientSecret, "client_secret");
        assert.strictEqual(client.scope, "offline_access offline");
        assert.strictEqual(JSON.stringify(client.redirectUris), JSON.stringify(["http://localhost:3000"]));
        assert.strictEqual(JSON.stringify(client.metadata), JSON.stringify({}));

        // Update the client
        const { client: updatedClient } = await OAuth2Recipe.updateOAuth2Client(
            {
                clientId: client.clientId,
                clientSecret: "new_client_secret",
                scope: "offline_access",
                redirectUris: null,
                metadata: { a: 1, b: 2 },
            },
            {}
        );

        assert.strictEqual(updatedClient.clientSecret, "new_client_secret");
        assert.strictEqual(updatedClient.scope, "offline_access");
        assert.strictEqual(updatedClient.redirectUris, null);
        assert.strictEqual(JSON.stringify(updatedClient.metadata), JSON.stringify({ a: 1, b: 2 }));
    });

    it("should delete the OAuth2Client", async function () {
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

        // Create a client
        const { client } = await OAuth2Recipe.createOAuth2Client(
            {
                client_id: "client_id",
                client_secret: "client_secret",
            },
            {}
        );

        assert.strictEqual(client.clientId, "client_id");
        assert.strictEqual(client.clientSecret, "client_secret");

        // Delete the client
        const { status } = await OAuth2Recipe.deleteOAuth2Client(
            {
                clientId: client.clientId,
            },
            {}
        );

        assert.strictEqual(status, "OK");
    });

    it("should get OAuth2Clients with pagination", async function () {
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

        // Create 10 clients
        for (let i = 0; i < 10; i++) {
            await OAuth2Recipe.createOAuth2Client(
                {
                    client_id: `client_id_${i}`,
                },
                {}
            );
        }

        let allClients = [];
        let nextPageToken = undefined;

        // Fetch clients in pages of 3
        do {
            const result = await OAuth2Recipe.getOAuth2Clients({ pageSize: 3, pageToken: nextPageToken }, {});
            assert.strictEqual(result.status, "OK");
            nextPageToken = result.nextPageToken;
            allClients.push(...result.clients);
        } while (nextPageToken);

        // Check the client IDs
        for (let i = 0; i < 10; i++) {
            assert.strictEqual(allClients[i].clientId, `client_id_${i}`);
        }
    });

    it("should get OAuth2Clients with filter", async function () {
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

        // Create 5 clients with clientName = "customClientName"
        for (let i = 0; i < 5; i++) {
            await OAuth2Recipe.createOAuth2Client({ clientName: "customClientName" }, {});
        }

        // Create 5 clients with owner = "test"
        for (let i = 0; i < 5; i++) {
            await OAuth2Recipe.createOAuth2Client({ owner: "test" }, {});
        }

        let result = await OAuth2Recipe.getOAuth2Clients({ clientName: "customClientName" }, {});
        assert.strictEqual(result.status, "OK");
        assert.strictEqual(result.clients.length, 5);

        result = await OAuth2Recipe.getOAuth2Clients({ owner: "test" }, {});
        assert.strictEqual(result.status, "OK");
        assert.strictEqual(result.clients.length, 5);
    });
});
