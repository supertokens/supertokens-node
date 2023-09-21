let assert = require("assert");
const e = require("cors");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let JWTRecipe = require("../../lib/build/recipe/jwt");
let { ProcessState } = require("../../lib/build/processState");
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`createJWTFeature: ${printPath("[test/jwt/createJWTFeature.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that sending 0 validity throws an error", async function () {
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
            recipeList: [JWTRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        try {
            await JWTRecipe.createJWT({}, 0);
            assert.fail();
        } catch (ignored) {
            // TODO (During Review): Should we check for the error message?
        }
    });

    it("Test that sending a invalid json throws an error", async function () {
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
            recipeList: [JWTRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let jwt = undefined;

        try {
            jwt = await JWTRecipe.createJWT("invalidjson", 1000);
        } catch (err) {
            // TODO (During Review): Should we check for the error message?
        }

        assert(jwt === undefined);
    });

    it("Test that returned JWT uses 100 years for expiry for default config", async function () {
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
            recipeList: [JWTRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let currentTimeInSeconds = Date.now() / 1000;
        let jwt = (await JWTRecipe.createJWT({})).jwt.split(".")[1];
        let decodedJWTPayload = Buffer.from(jwt, "base64").toString("utf-8");

        let targetExpiryDuration = 3153600000; // 100 years in seconds
        let jwtExpiry = JSON.parse(decodedJWTPayload)["exp"];
        let actualExpiry = jwtExpiry - currentTimeInSeconds;

        let differenceInExpiryDurations = Math.abs(actualExpiry - targetExpiryDuration);

        // Both expiry durations should be within 5 seconds of each other. Using 5 seconds as a worst case buffer
        assert(differenceInExpiryDurations < 5);
    });

    it("Test that jwt validity is same as validity set in config", async function () {
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
            recipeList: [
                JWTRecipe.init({
                    jwtValiditySeconds: 1000,
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let currentTimeInSeconds = Date.now() / 1000;
        let jwt = (await JWTRecipe.createJWT({})).jwt.split(".")[1];
        let decodedJWTPayload = Buffer.from(jwt, "base64").toString("utf-8");

        let targetExpiryDuration = 1000; // 100 years in seconds
        let jwtExpiry = JSON.parse(decodedJWTPayload)["exp"];
        let actualExpiry = jwtExpiry - currentTimeInSeconds;

        let differenceInExpiryDurations = Math.abs(actualExpiry - targetExpiryDuration);

        // Both expiry durations should be within 5 seconds of each other. Using 5 seconds as a worst case buffer
        assert(differenceInExpiryDurations < 5);
    });

    it("Test that jwt validity is same as validity passed in createJWT function", async function () {
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
            recipeList: [
                JWTRecipe.init({
                    jwtValiditySeconds: 1000,
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let currentTimeInSeconds = Date.now() / 1000;
        let targetExpiryDuration = 500; // 100 years in seconds

        let jwt = (await JWTRecipe.createJWT({}, targetExpiryDuration)).jwt.split(".")[1];
        let decodedJWTPayload = Buffer.from(jwt, "base64").toString("utf-8");

        let jwtExpiry = JSON.parse(decodedJWTPayload)["exp"];
        let actualExpiry = jwtExpiry - currentTimeInSeconds;

        let differenceInExpiryDurations = Math.abs(actualExpiry - targetExpiryDuration);

        // Both expiry durations should be within 5 seconds of each other. Using 5 seconds as a worst case buffer
        assert(differenceInExpiryDurations < 5);
    });
});
