const { ProcessState } = require("../lib/build/processState");
const { printPath, killAllST, setupST, cleanST, startST } = require("./utils");
let STExpress = require("../");
let Dashboard = require("../recipe/dashboard");
let EmailVerification = require("../recipe/emailverification");
let EmailPassword = require("../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../framework/express");
let Session = require("../recipe/session");
let { Querier } = require("../lib/build/querier");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
let assert = require("assert");
const RateLimitedStatus = 429;

describe(`Querier rate limiting: ${printPath("[test/ratelimiting.test.js]")}`, () => {
    beforeEach(async () => {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
        Querier.apiVersion = undefined;
    });

    it("Test that network call is retried properly", async () => {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                // Using 8083 because we need querier to call the test express server instead of the core
                connectionURI: "http://localhost:8083",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Dashboard.init({
                    apiKey: "testapikey",
                }),
                EmailPassword.init(),
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                Session.init(),
            ],
        });
        Querier.apiVersion = "3.0";

        let numbersOfTimesRetried = 0;
        let numberOfTimesSecondCalled = 0;
        let numberOfTimesThirdCalled = 0;

        const app = express();

        app.use(middleware());

        app.get("/testing", async (_, res, __) => {
            numbersOfTimesRetried++;
            return res.status(RateLimitedStatus).json({});
        });

        app.get("/testing2", async (_, res, __) => {
            numberOfTimesSecondCalled++;

            if (numberOfTimesSecondCalled === 3) {
                return res.status(200).json({});
            }

            return res.status(RateLimitedStatus).json({});
        });

        app.get("/testing3", async (_, res, __) => {
            numberOfTimesThirdCalled++;
            return res.status(200).json({});
        });

        app.use(errorHandler());

        const server = app.listen(8083, () => {});

        let q = Querier.getNewInstanceOrThrowError(undefined);

        try {
            await q.sendGetRequest(new NormalisedURLPath("/testing"), {}, {});
        } catch (e) {
            if (!e.message.includes("with status code: 429")) {
                throw e;
            }
        }

        // 1 initial request + 5 retries
        assert.equal(numbersOfTimesRetried, 6);

        await q.sendGetRequest(new NormalisedURLPath("/testing2"), {}, {});
        assert.equal(numberOfTimesSecondCalled, 3);

        await q.sendGetRequest(new NormalisedURLPath("/testing3"), {}, {});
        assert.equal(numberOfTimesThirdCalled, 1);

        server.close();
    });

    it("Test that rate limiting errors are thrown back to the user", async () => {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                // Using 8083 because we need querier to call the test express server instead of the core
                connectionURI: "http://localhost:8083",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Dashboard.init({
                    apiKey: "testapikey",
                }),
                EmailPassword.init(),
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                Session.init(),
            ],
        });
        Querier.apiVersion = "3.0";

        const app = express();

        app.use(middleware());

        app.get("/testing", async (_, res, __) => {
            return res.status(RateLimitedStatus).json({
                status: "RATE_ERROR",
            });
        });

        app.use(errorHandler());

        const server = app.listen(8083, () => {});

        let q = Querier.getNewInstanceOrThrowError(undefined);

        try {
            await q.sendGetRequest(new NormalisedURLPath("/testing"), {}, {});
        } catch (e) {
            if (!e.message.includes("with status code: 429")) {
                throw e;
            }

            assert.equal(e.message.includes('message: {"status":"RATE_ERROR"}'), true);
        }

        server.close();
    });

    it("Test that parallel calls have independent retry counters", async () => {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                // Using 8083 because we need querier to call the test express server instead of the core
                connectionURI: "http://localhost:8083",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Dashboard.init({
                    apiKey: "testapikey",
                }),
                EmailPassword.init(),
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                Session.init(),
            ],
        });
        Querier.apiVersion = "3.0";

        const app = express();

        app.use(middleware());

        let numberOfTimesFirstCalled = 0;
        let numberOfTimesSecondCalled = 0;

        app.get("/testing", async (req, res, __) => {
            if (req.query.id === "1") {
                numberOfTimesFirstCalled++;
            } else {
                numberOfTimesSecondCalled++;
            }
            return res.status(RateLimitedStatus).json({});
        });

        app.use(errorHandler());

        const server = app.listen(8083, () => {});

        let q = Querier.getNewInstanceOrThrowError(undefined);

        const callApi1 = async () => {
            try {
                await q.sendGetRequest(new NormalisedURLPath("/testing"), { id: "1" }, {});
            } catch (e) {
                if (!e.message.includes("with status code: 429")) {
                    throw e;
                }
            }
        };

        const callApi2 = async () => {
            try {
                await q.sendGetRequest(new NormalisedURLPath("/testing"), { id: "2" }, {});
            } catch (e) {
                if (!e.message.includes("with status code: 429")) {
                    throw e;
                }
            }
        };

        await Promise.all([callApi1(), callApi2()]);

        // 1 initial request + 5 retries each
        assert.equal(numberOfTimesFirstCalled, 6);
        assert.equal(numberOfTimesSecondCalled, 6);

        server.close();
    });
});
