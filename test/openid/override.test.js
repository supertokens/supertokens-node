let assert = require("assert");
const express = require("express");
const request = require("supertest");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
const OpenIdRecipe = require("../../lib/build/recipe/openid/recipe").default;
const OpenId = require("../../lib/build/recipe/openid");
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`overrideTest: ${printPath("[test/openid/override.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test overriding open id functions", async function () {
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
                OpenIdRecipe.init({
                    issuer: "https://api.supertokens.io/auth",
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                getOpenIdDiscoveryConfiguration: function () {
                                    return {
                                        issuer: "https://customissuer",
                                        jwks_uri: "https://customissuer/jwks",
                                    };
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) => {
            request(app)
                .get("/auth/.well-known/openid-configuration")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });

        assert(response.body !== undefined);
        assert.equal(response.body.issuer, "https://customissuer");
        assert.equal(response.body.jwks_uri, "https://customissuer/jwks");
    });

    it("Test overriding open id apis", async function () {
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
                OpenIdRecipe.init({
                    issuer: "https://api.supertokens.io/auth",
                    override: {
                        apis: function (oi) {
                            return {
                                ...oi,
                                getOpenIdDiscoveryConfigurationGET: function ({ options }) {
                                    return {
                                        status: "OK",
                                        issuer: "https://customissuer",
                                        jwks_uri: "https://customissuer/jwks",
                                    };
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) => {
            request(app)
                .get("/auth/.well-known/openid-configuration")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });

        assert(response.body !== undefined);
        assert.equal(response.body.issuer, "https://customissuer");
        assert.equal(response.body.jwks_uri, "https://customissuer/jwks");
    });
});
