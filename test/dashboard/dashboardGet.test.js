const { ProcessState } = require("../../lib/build/processState");
const { printPath, killAllST, setupST, cleanST, startST } = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let assert = require("assert");

describe(`User Dashboard get: ${printPath("[test/dashboard/dashboardGet.test.js]")}`, () => {
    beforeEach(async () => {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    const dashboardURL = "/auth/dashboard/";

    describe("Test connectionURI", function () {
        it("Test connectionURI contains http protocol", async () => {
            const connectionURI = await startST();
            // removing protocol from the original connectionURI.
            const connectionURIWithoutProtocol = connectionURI.replace("http://", "");

            STExpress.init({
                supertokens: {
                    connectionURI: connectionURIWithoutProtocol,
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
                ],
            });

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((res) => {
                request(app)
                    .get(dashboardURL)
                    .set("Authorization", "Bearer testapikey")
                    .end((err, response) => {
                        if (err) {
                            res(undefined);
                        } else {
                            res(response.text);
                        }
                    });
            });

            // checking if the original connectionURL with protocol is returned in the html response.
            assert(response.includes(`window.connectionURI = "${connectionURI}"`));
        });

        it("Test connectionURI contains https protocol", async () => {
            const connectionURI = "https://try.supertokens.com";
            // removing protocol from the original connectionURI.
            const connectionURIWithoutProtocol = connectionURI.replace("https://", "");

            STExpress.init({
                supertokens: {
                    connectionURI: connectionURIWithoutProtocol,
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
                ],
            });

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((res) => {
                request(app)
                    .get(dashboardURL)
                    .set("Authorization", "Bearer testapikey")
                    .end((err, response) => {
                        if (err) {
                            res(undefined);
                        } else {
                            res(response.text);
                        }
                    });
            });
            // checking if the original connectionURL with protocol is returned in the html response.
            assert(response.includes(`window.connectionURI = "${connectionURI}"`));
        });

        it("Test multiple connection URIs", async () => {
            const firstConnectionURI = await startST();
            const secondConnectionURI = "https://try.supertokens.com";

            const multipleConnectionURIs = `${firstConnectionURI};${secondConnectionURI}`;

            STExpress.init({
                supertokens: {
                    connectionURI: multipleConnectionURIs,
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
                ],
            });

            const app = express();

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((res) => {
                request(app)
                    .get(dashboardURL)
                    .set("Authorization", "Bearer testapikey")
                    .end((err, response) => {
                        if (err) {
                            res(undefined);
                        } else {
                            res(response.text);
                        }
                    });
            });

            // should consider the first connection URI and ignore the second one..
            assert(response.includes(`window.connectionURI = "${firstConnectionURI}"`));
            assert(!response.includes(`window.connectionURI = "${secondConnectionURI}"`));
        });
    });

    describe("Test CSP headers", function () {
        it("should allow https://cdn.jsdelvr.net/gh/supertokens/ ", async () => {
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
                    Dashboard.init({
                        apiKey: "testapikey",
                    }),
                    EmailPassword.init(),
                ],
            });

            const app = express();

            app.use(function (_, res, next) {
                // setting dummy headers to make sure that api overrides the original set csp value.
                res.setHeader(
                    "Content-Security-Policy",
                    "script-src 'self' 'unsafe-inline' https://supertokens.com ; img-src 'self' https://supertokens.com"
                );
                return next();
            });

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((res) => {
                request(app)
                    .get(dashboardURL)
                    .set("Authorization", "Bearer testapikey")
                    .end((err, response) => {
                        if (err) {
                            res(undefined);
                        } else {
                            res(response);
                        }
                    });
            });
            assert.strictEqual(
                response.header["content-security-policy"],
                "script-src https://cdn.jsdelivr.net/gh/supertokens/dashboard@v0.10/build 'self' 'unsafe-inline' https://supertokens.com ; script-src https://cdn.jsdelivr.net/gh/supertokens/dashboard@v0.10/build 'self' https://supertokens.com"
            );
        });

        it("should allow https://cdn.jsdelvr.net/gh/supertokens/ ", async () => {
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
                    Dashboard.init({
                        apiKey: "testapikey",
                    }),
                    EmailPassword.init(),
                ],
            });

            const app = express();

            app.use(function (_, res, next) {
                // setting dummy headers to make sure that api overrides the original set csp value.
                res.setHeader(
                    "Content-Security-Policy",
                    "script-src 'self' 'unsafe-inline' https://supertokens.com ; img-src 'self' https://supertokens.com"
                );
                return next();
            });

            app.use(middleware());

            app.use(errorHandler());

            let response = await new Promise((res) => {
                request(app)
                    .get(dashboardURL)
                    .set("Authorization", "Bearer testapikey")
                    .end((err, response) => {
                        if (err) {
                            res(undefined);
                        } else {
                            res(response);
                        }
                    });
            });
            assert.strictEqual(
                response.header["content-security-policy"],
                "script-src https://cdn.jsdelivr.net/gh/supertokens/dashboard@v0.10/build 'self' 'unsafe-inline' https://supertokens.com ; script-src https://cdn.jsdelivr.net/gh/supertokens/dashboard@v0.10/build 'self' https://supertokens.com"
            );
        });
    });
});
