/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

const {
    printPath,
    setupST,
    startST,
    killAllST,
    cleanST,
    setKeyValueInConfig,
    stopST,
    signUPRequest,
    extractInfoFromResponse,
    enableFactorRequest,
    listFactorsRequest,
    signInUPCustomRequest,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Passwordless = require("../../recipe/passwordless");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let Mfa = require("../../recipe/mfa");
let Totp = require("../../recipe/totp");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");

describe(`apiFunctions: ${printPath("[test/mfa/apis.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test that MFA works", async function () {
        await startST();

        const customProvider1 = {
            id: "custom",
            get: (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: authCodeResponse.id,
                            email: {
                                id: authCodeResponse.email,
                                isVerified: true,
                            },
                        };
                    },
                    getClientId: () => {
                        return "supertokens";
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
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [customProvider1],
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                Mfa.init({ defaultFirstFactors: ["emailpassword"] }),
                // Passwordless.init({
                //     contactMethod: "EMAIL_OR_PHONE",
                //     flowType: 'USER_INPUT_CODE',
                //     getCustomUserInputCode: async (_) => {
                //         return '123456'
                //     }
                // }),
                // Totp.init({}),
            ],
        });

        const app = express();

        // add route to get session handle
        app.get("/sessioninfo", async (req, res) => {
            res.json(await Session.getSession(req, res, true));
        });

        app.use(middleware());
        app.use(errorHandler());

        // let response =

        let response = await signInUPCustomRequest(app, "test@example.com", "customId");
        let info1 = extractInfoFromResponse(response);
        assert(response.status === 200);
        assert(response.body.status === "OK");

        // let response = await

        // response = await enableFactorRequest(app, "totp");
        // assert(response.status === 200);

        response = await request(app)
            .get("/auth/mfa/factors/list")
            .set("Cookie", ["sAccessToken=" + info1.accessToken]);
        assert(response.status === 200);
        assert.deepEqual(response.body.factors, ["thirdparty", "emailpassword"]);

        response = await request(app)
            .get("/auth/mfa/factor/is-setup")
            .query({ factorId: "emailpassword" })
            .set("Cookie", ["sAccessToken=" + info1.accessToken]);
        assert(response.status === 200);
        assert(response.body.isSetup === false);

        // response = await signUPRequest(app, "test@example.com", "validpass123");
        response = await request(app)
            .post("/auth/signup")
            .set("Cookie", ["sAccessToken=" + info1.accessToken])
            .send({
                formFields: [
                    { id: "password", value: "validpass123" },
                    { id: "email", value: "test@example.com" },
                ],
            });
        let info2 = extractInfoFromResponse(response);
        assert(response.status === 200);
        assert(response.body.status === "OK");

        // response = await request(app).post("/auth/signinup/code").set("Cookie", ["sAccessToken=" + info.accessToken]).send({ email: "test@example.com" });
        // assert(response.status === 200);
        // assert(response.body.status === "OK");

        // response = await request(app).post("/auth/signinup/code/consume").set("Cookie", ["sAccessToken=" + info.accessToken]).send({
        //     preAuthSessionId: response.body.preAuthSessionId,
        //     userInputCode: "123456",
        //     deviceId: response.body.deviceId
        // });
        // info = extractInfoFromResponse(response);
        // assert(response.status === 200);
        // assert(response.body.status === "OK");

        response = await request(app)
            .get("/auth/mfa/factor/is-setup")
            .query({ factorId: "emailpassword" })
            .set("Cookie", ["sAccessToken=" + info1.accessToken]);
        assert(response.status === 200);
        assert(response.body.isSetup === true);

        response = await request(app)
            .get("/auth/mfa/factor/is-setup")
            .query({ factorId: "emailpassword" })
            .set("Cookie", ["sAccessToken=" + info2.accessToken]);
        assert(response.status === 200);
        assert(response.body.isSetup === true);

        // assert(response.status === 403);
        // assert(response.body.message === 'invalid claim');
        // assert.deepEqual(response.body.claimValidationErrors, [
        //     {id: 'st-mfa', reason: { message: 'Need to complete one of the required factors', choices: ['totp']}}
        // ]);

        // response = await request(app).post("/auth/totp/device").set("Cookie", ["sAccessToken=" + info.accessToken]).send({ deviceName: "test" });
        // const totpSecret = response.body.secret;
        // assert(response.status === 200);
        // assert(totpSecret !== undefined);

        // console.log(response);
    });
});
