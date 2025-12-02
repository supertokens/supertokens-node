let assert = require("assert");
const express = require("express");
const request = require("supertest");

const { printPath, createCoreApplication } = require("../utils");
let STExpress = require("../../");
let { ProcessState } = require("../../lib/build/processState");
let JWTRecipe = require("../../lib/build/recipe/jwt");
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
let { middleware, errorHandler } = require("../../framework/express");

describe(`overrideTest: ${printPath("[test/jwt/override.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    it("Test overriding functions", async function () {
        const connectionURI = await createCoreApplication();

        let jwtCreated = undefined;
        let jwksKeys = undefined;

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
                    override: {
                        functions: (originalImplementation) => {
                            return {
                                ...originalImplementation,
                                createJWT: async (input) => {
                                    let createJWTResponse = await originalImplementation.createJWT(input);

                                    if (createJWTResponse.status === "OK") {
                                        jwtCreated = createJWTResponse.jwt;
                                    }

                                    return createJWTResponse;
                                },
                                getJWKS: async (input) => {
                                    let getJWKSResponse = await originalImplementation.getJWKS(input);

                                    jwksKeys = getJWKSResponse.keys;

                                    return getJWKSResponse;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        let app = express();

        app.use(middleware());

        app.use(errorHandler());
        app.use(express.json());

        app.post("/jwtcreate", async (req, res) => {
            let payload = req.body.payload;
            res.json(await JWTRecipe.createJWT(payload, 1000));
        });

        let createJWTResponse = await new Promise((resolve, reject) => {
            request(app)
                .post("/jwtcreate")
                .send({
                    payload: { someKey: "someValue" },
                })
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.body);
                    }
                });
        });

        assert.notStrictEqual(jwtCreated, undefined);
        assert.deepStrictEqual(jwtCreated, createJWTResponse.jwt);

        let getJWKSResponse = await new Promise((resolve, reject) => {
            request(app)
                .get("/auth/jwt/jwks.json")
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.body);
                    }
                });
        });

        assert.notStrictEqual(jwksKeys, undefined);
        assert.deepStrictEqual(jwksKeys, getJWKSResponse.keys);
    });

    it("Test overriding APIs", async function () {
        const connectionURI = await createCoreApplication();

        let jwksKeys = undefined;

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
                    override: {
                        apis: (originalImplementation) => {
                            return {
                                ...originalImplementation,
                                getJWKSGET: async (input) => {
                                    let response = await originalImplementation.getJWKSGET(input);
                                    jwksKeys = response.keys;
                                    return response;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        let getJWKSResponse = await new Promise((resolve, reject) => {
            request(app)
                .get("/auth/jwt/jwks.json")
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.body);
                    }
                });
        });

        assert.notStrictEqual(jwksKeys, undefined);
        assert.deepStrictEqual(jwksKeys, getJWKSResponse.keys);
    });
});
