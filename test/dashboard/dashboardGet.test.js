const { ProcessState } = require("../../lib/build/processState");
const { printPath, killAllST, setupST, cleanST, startST } = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let assert = require("assert");

let DashboardRecipe = require("../../lib/build/recipe/dashboard/recipe").default;
let NormalisedURLDomain = require("../../lib/build/normalisedURLDomain").default;

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
            const connectionURI = "https://try.supertokens.com/appid-public";
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
            const firstConnectionURI = "https://try.supertokens.com/appid-public";
            const secondConnectionURI = await startST();

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

    describe("Test CSP headers, when the overrideCSPHeaders is true and CSP is enabled.", function () {
        it("Should override CSP headers by allowing bundleDomain name when the overrideCSPHeader is true", async () => {
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
                        overrideCSPHeaders: true,
                    }),
                    EmailPassword.init(),
                ],
            });

            const app = express();

            app.use(function (_, res, next) {
                // Setting dummy headers to make sure that api overrides the original set csp value.
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

            const dashboardRecipe = DashboardRecipe.getInstanceOrThrowError();
            const bundleBasePathString = await dashboardRecipe.recipeInterfaceImpl.getDashboardBundleLocation();
            const bundleDomain = new NormalisedURLDomain(bundleBasePathString).getAsStringDangerous();

            const cspHeaderValue = `script-src: 'self' 'unsafe-inline' ${bundleDomain} img-src: ${bundleDomain}`;

            assert.strictEqual(response.header["content-security-policy"], cspHeaderValue);
        });

        it("Should not override CSP default headers when the overrideCSPHeader is false/undefined", async () => {
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
                        overrideCSPHeaders: false,
                    }),
                    EmailPassword.init(),
                ],
            });

            const app = express();

            const defaultCSPHeaderValue =
                "script-src 'self' 'unsafe-inline' https://supertokens.com ; img-src 'self' https://supertokens.com";
            app.use(function (_, res, next) {
                // Setting dummy headers to make sure that api overrides the original set csp value.
                res.setHeader("Content-Security-Policy", defaultCSPHeaderValue);
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

            const dashboardRecipe = DashboardRecipe.getInstanceOrThrowError();
            const bundleBasePathString = await dashboardRecipe.recipeInterfaceImpl.getDashboardBundleLocation();
            const bundleDomain = new NormalisedURLDomain(bundleBasePathString).getAsStringDangerous();

            const cspHeaderValue = `script-src: 'self' 'unsafe-inline' ${bundleDomain} img-src: ${bundleDomain}`;

            assert.notStrictEqual(response.header["content-security-policy"], cspHeaderValue);
            assert.strictEqual(response.header["content-security-policy"], defaultCSPHeaderValue);
        });

        it("Should override CSP headers by allowing bundleDomain name when there is no predefined CSP header config", async () => {
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
                        overrideCSPHeaders: true,
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
                            res(response);
                        }
                    });
            });

            const dashboardRecipe = DashboardRecipe.getInstanceOrThrowError();
            const bundleBasePathString = await dashboardRecipe.recipeInterfaceImpl.getDashboardBundleLocation();
            const bundleDomain = new NormalisedURLDomain(bundleBasePathString).getAsStringDangerous();

            const cspHeaderValue = `script-src: 'self' 'unsafe-inline' ${bundleDomain} img-src: ${bundleDomain}`;

            assert.strictEqual(response.header["content-security-policy"], cspHeaderValue);
        });

        it("Should not add CSP headers when there is no predefined CSP header config and overrideCSPHeader boolean is false", async () => {
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
                        overrideCSPHeaders: false,
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
                            res(response);
                        }
                    });
            });

            const dashboardRecipe = DashboardRecipe.getInstanceOrThrowError();
            const bundleBasePathString = await dashboardRecipe.recipeInterfaceImpl.getDashboardBundleLocation();
            const bundleDomain = new NormalisedURLDomain(bundleBasePathString).getAsStringDangerous();

            const cspHeaderValue = `script-src: 'self' 'unsafe-inline' ${bundleDomain} img-src: ${bundleDomain}`;

            assert.notStrictEqual(response.header["content-security-policy"], cspHeaderValue);
            assert.strictEqual(response.header["content-security-policy"], undefined);
        });
    });
});
