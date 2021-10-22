let assert = require("assert");
const express = require("express");
const request = require("supertest");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let { ProcessState } = require("../../lib/build/processState");
let JWTRecipe = require("../../lib/build/recipe/jwt");
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`getJWKS: ${printPath("[test/jwt/getJWKS.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that default getJWKS api does not work when disabled", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                JWTRecipe.init({
                    override: {
                        apis: async (originalImplementation) => {
                            return {
                                ...originalImplementation,
                                getJWKSGET: undefined,
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
                .get("/auth/jwt/jwks.json")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });

        assert(response.status === 404);
    });

    it("Test that default getJWKS works fine", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [JWTRecipe.init({})],
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
                .get("/auth/jwt/jwks.json")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                });
        });

        assert(response !== undefined);
        assert(response.keys !== undefined);
        assert(response.keys.length > 0);
    });
});
