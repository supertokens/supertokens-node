const { printPath, setupST, startST, killAllST, cleanST, createServerlessCacheForTesting } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
const nock = require("nock");
const express = require("express");
const request = require("supertest");
const { removeServerlessCache } = require("../../lib/build/utils");

describe.only(`getUsersByEmail: ${printPath("[test/thirdparty/getUsersByEmailFeature.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("invalid email yields 400 Bad Request", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [() => {}],
                    },
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());
        app.use(STExpress.errorHandler());

        const response = await new Promise((resolve) => {
            request(app)
                .get("/auth/users/by-email?email=invalid@email")
                .end((err, res) => {
                    if (err) {
                        return resolve(undefined);
                    }

                    return resolve(res);
                });
        });

        assert.notStrictEqual(response, undefined);
        assert.strictEqual(response.status, 400);
    });

    it("valid email yields a user", async function () {
        await startST();

        const MockThirdPartyProvider = {
            id: "mock",
            get: async (recipe, authorisationCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "mockUserId",
                            email: {
                                id: "john.doe@example.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };

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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [MockThirdPartyProvider],
                    },
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());
        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        const signUpResponse = await new Promise((resolve) => {
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "mock",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });

        const { body: responseBody } = await new Promise((resolve) => {
            request(app)
                .get("/auth/users/by-email?email=john.doe@example.com")
                .end((err, res) => {
                    if (err) {
                        return resolve(undefined);
                    }

                    resolve(res);
                });
        });

        assert.strictEqual(responseBody.status, "OK");

        const firstUser = responseBody.users[0];

        assert.deepStrictEqual(firstUser.thirdParty, {
            id: "mock",
            userId: "mockUserId",
        });
        assert.deepStrictEqual(firstUser.email, "john.doe@example.com");
        assert.notStrictEqual(firstUser.id, undefined);
        assert.notStrictEqual(firstUser.timeJoined, undefined);
    });
});
