const { printPath, setupST, startST, killAllST, cleanST, createServerlessCacheForTesting } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
const express = require("express");
const request = require("supertest");
const { removeServerlessCache } = require("../../lib/build/utils");

describe(`getUsersByEmail: ${printPath("[test/thirdparty/getUsersByEmailFeature.test.js]")}`, function () {
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

        const response = new Promise((resolve) => {
            request(app)
                .get("/recipe/users/by-email?email=invalid@email")
                .end((err, res) => {
                    if (err) {
                        return resolve(undefined);
                    }

                    return resolve(res);
                });
        });

        assert.notStrictEqual(response, undefined);
        assert.strictEqual(response.statusCode, 500);
    });
});
