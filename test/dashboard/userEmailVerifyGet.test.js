const { ProcessState } = require("../../lib/build/processState");
const { printPath, killAllST, setupST, cleanST, startST } = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let EmailVerification = require("../../recipe/emailverification");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let assert = require("assert");
let Session = require("../../recipe/session");

describe(`User Dashboard userEmailVerifyGet: ${printPath("[test/dashboard/userEmailVerifyGet.test.js]")}`, () => {
    beforeEach(async () => {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that api returns correct value for email verification", async () => {
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const signUpResponse = await EmailPassword.signUp("public", "test@supertokens.com", "abcd1234");
        assert(signUpResponse.status === "OK");

        const user = signUpResponse.user;

        const emailVerificationUrl = "/auth/dashboard/api/user/email/verify";

        let emailVerifyResponse = await new Promise((res) => {
            request(app)
                .get(emailVerificationUrl + "?email=test@supertokens.com&recipeUserId=" + user.id)
                .set("Authorization", "Bearer testapikey")
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(emailVerifyResponse.status, "OK");
        assert.strictEqual(emailVerifyResponse.isVerified, false);

        const tokenResponse = await EmailVerification.createEmailVerificationToken(
            "public",
            user.loginMethods[0].recipeUserId
        );
        assert(tokenResponse.status === "OK");

        const verificationResponse = await EmailVerification.verifyEmailUsingToken("public", tokenResponse.token);

        assert(verificationResponse.status === "OK");

        emailVerifyResponse = await new Promise((res) => {
            request(app)
                .get(emailVerificationUrl + "?email=test@supertokens.com&recipeUserId=" + user.id)
                .set("Authorization", "Bearer testapikey")
                .end((err, response) => {
                    if (err) {
                        res(undefined);
                    } else {
                        res(JSON.parse(response.text));
                    }
                });
        });

        assert.strictEqual(emailVerifyResponse.status, "OK");
        assert.strictEqual(emailVerifyResponse.isVerified, true);
    });
});
