/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

const { printPath, setupST, startST, stopST, killAllST, cleanST } = require("./utils");
let assert = require("assert");
const httpMocks = require("node-mocks-http");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../lib/build/supertokens").default;
const Session = require("../lib/build/recipe/session");
const EmailPassword = require("../lib/build/recipe/emailpassword");
const superTokensMiddleware = require("../lib/build/nextjs").superTokensMiddleware;
const noOp = () => {};

describe(`NextJS Middleware Test: ${printPath("[test/helpers/nextjs/index.test.js]")}`, function () {
    before(async function () {
        await killAllST();
        await setupST();
        await startST();
        ProcessState.getInstance().reset();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                apiBasePath: "/api/auth",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Sign Up", function (done) {
        const request = httpMocks.createRequest({
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            url: "/api/auth/signup/",
            body: {
                formFields: [
                    {
                        id: "email",
                        value: "john.doe@supertokens.io",
                    },
                    {
                        id: "password",
                        value: "P@sSW0rd",
                    },
                ],
            },
        });

        const response = httpMocks.createResponse({
            eventEmitter: require("events").EventEmitter,
        });

        response.on("end", () => {
            assert.deepStrictEqual(response._getJSONData().status, "OK");
            assert.deepStrictEqual(response._getJSONData().user.email, "john.doe@supertokens.io");
            assert(response._getHeaders()["front-token"] !== undefined);
            assert(response._getHeaders()["set-cookie"][0].startsWith("sAccessToken="));
            assert(response._getHeaders()["set-cookie"][1].startsWith("sRefreshToken="));
            return done();
        });

        superTokensMiddleware(request, response, noOp);
    });

    it("Sign In", function (done) {
        const request = httpMocks.createRequest({
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            url: "/api/auth/signin/",
            body: {
                formFields: [
                    {
                        id: "email",
                        value: "john.doe@supertokens.io",
                    },
                    {
                        id: "password",
                        value: "P@sSW0rd",
                    },
                ],
            },
        });

        const response = httpMocks.createResponse({
            eventEmitter: require("events").EventEmitter,
        });

        response.on("end", () => {
            assert.deepStrictEqual(response._getJSONData().status, "OK");
            assert.deepStrictEqual(response._getJSONData().user.email, "john.doe@supertokens.io");
            assert(response._getHeaders()["front-token"] !== undefined);
            assert(response._getHeaders()["set-cookie"][0].startsWith("sAccessToken="));
            assert(response._getHeaders()["set-cookie"][1].startsWith("sRefreshToken="));
            return done();
        });

        superTokensMiddleware(request, response, noOp);
    });

    it("Reset Password Send Email", function (done) {
        const request = httpMocks.createRequest({
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            url: "/api/auth/user/password/reset/token",
            body: {
                formFields: [
                    {
                        id: "email",
                        value: "john.do@supertokens.io",
                    },
                ],
            },
        });

        const response = httpMocks.createResponse({
            eventEmitter: require("events").EventEmitter,
        });

        response.on("end", () => {
            assert.deepStrictEqual(response._getJSONData().status, "OK");
            return done();
        });

        superTokensMiddleware(request, response, noOp);
    });

    it("Reset Password Send Email", function (done) {
        const request = httpMocks.createRequest({
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            url: "/api/auth/user/password/reset/",
            body: {
                formFields: [
                    {
                        id: "password",
                        value: "NewP@sSW0rd",
                    },
                ],
                token: "RandomToken",
            },
        });

        const response = httpMocks.createResponse({
            eventEmitter: require("events").EventEmitter,
        });

        response.on("end", () => {
            assert.deepStrictEqual(response._getJSONData().status, "RESET_PASSWORD_INVALID_TOKEN_ERROR");
            return done();
        });

        superTokensMiddleware(request, response, noOp);
    });

    it("does Email Exist with existing email", function (done) {
        const request = httpMocks.createRequest({
            method: "GET",
            headers: {
                rid: "emailpassword",
            },
            url: "/api/auth/signup/email/exists",
            query: {
                email: "john.doe@supertokens.io",
            },
        });

        const response = httpMocks.createResponse({
            eventEmitter: require("events").EventEmitter,
        });

        response.on("end", () => {
            assert.deepStrictEqual(response._getJSONData(), { status: "OK", exists: true });
            return done();
        });

        superTokensMiddleware(request, response, noOp);
    });

    it("does Email Exist with unknown email", function (done) {
        const request = httpMocks.createRequest({
            method: "GET",
            headers: {
                rid: "emailpassword",
            },
            url: "/api/auth/signup/email/exists",
            query: {
                email: "unknown@supertokens.io",
            },
        });

        const response = httpMocks.createResponse({
            eventEmitter: require("events").EventEmitter,
        });

        response.on("end", () => {
            assert.deepStrictEqual(response._getJSONData().exists, false);
            return done();
        });

        superTokensMiddleware(request, response, noOp);
    });
});
