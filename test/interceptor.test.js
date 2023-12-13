const {
    printPath,
    setupST,
    startST,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
    killAllSTCoresOnly,
    mockResponse,
    mockRequest,
    signUPRequest,
    assertJSONEquals,
} = require("./utils");
let { ProcessState } = require("../lib/build/processState");

let SuperTokens = require("../");
let Session = require("../recipe/session");
let EmailPassword = require("../recipe/emailpassword");
let UserRoles = require("../recipe/userroles");

let assert = require("assert");
const express = require("express");
let { middleware, errorHandler } = require("../framework/express");

describe(`interceptor: ${printPath("[test/interceptor.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("network interceptor sanity", async function () {
        let isNetworkIntercepted = false;
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
                networkInterceptor: (request, __) => {
                    isNetworkIntercepted = true;
                    return request;
                },
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");

        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);
        assert(isNetworkIntercepted === true);
    });

    it("network interceptor - incorrect core url", async function () {
        let isNetworkIntercepted = false;
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
                networkInterceptor: (request, __) => {
                    isNetworkIntercepted = true;
                    newRequest = request;
                    newRequest.url = newRequest.url + "/incorrect/path";
                    return newRequest;
                },
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");

        assert(isNetworkIntercepted === true);
        assert(response.text.includes("status code: 404"));
    });

    it("network interceptor - incorrect query params", async function () {
        let isNetworkIntercepted = false;
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
                networkInterceptor: (request, __) => {
                    isNetworkIntercepted = true;
                    newRequest = request;
                    newRequest.params = { incorrect: "param" };
                    return newRequest;
                },
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                UserRoles.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let isErr = false;
        try {
            await UserRoles.getRolesForUser("public", "someUserID");
        } catch (err) {
            isErr = true;
            assert(err.message.includes("status code: 400"));
        }

        assert(isNetworkIntercepted === true);
        assert(isErr === true);
    });

    it("network interceptor - incorrect request body", async function () {
        let isNetworkIntercepted = false;
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
                networkInterceptor: (request, __) => {
                    isNetworkIntercepted = true;
                    newRequest = request;
                    newRequest.body = { incorrect: "body" };
                    return newRequest;
                },
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");

        assert(isNetworkIntercepted === true);
        assert(response.text.includes("status code: 400"));
    });
});
