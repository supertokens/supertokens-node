/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

const express = require("express");
const { middleware, errorHandler } = require("../../framework/express");
const SuperTokens = require("../../");
const Passwordless = require("../../lib/build/recipe/passwordless");
const EmailVerification = require("../../lib/build/recipe/emailverification");
const { json } = require("body-parser");
const request = require("supertest");

module.exports.getTestExpressApp = function () {
    const app = express();

    app.use(middleware());
    app.use(json());

    app.use(errorHandler());
    return app;
};

module.exports.epSignUp = async function (app, email, password, accessToken) {
    if (accessToken === undefined) {
        return request(app)
            .post("/auth/signup")
            .send({
                formFields: [
                    {
                        id: "password",
                        value: password,
                    },
                    {
                        id: "email",
                        value: email,
                    },
                ],
            })
            .expect(200);
    } else {
        return request(app)
            .post("/auth/signup")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                formFields: [
                    {
                        id: "password",
                        value: password,
                    },
                    {
                        id: "email",
                        value: email,
                    },
                ],
            })
            .expect(200);
    }
};

module.exports.validateUserEmail = async (id) => {
    return EmailVerification.verifyEmailUsingToken(
        "public",
        (await EmailVerification.createEmailVerificationToken("public", SuperTokens.convertToRecipeUserId(id))).token,
        false
    );
};

module.exports.epSignIn = async function (app, email, password, accessToken) {
    if (accessToken === undefined) {
        return request(app)
            .post("/auth/signin")
            .send({
                formFields: [
                    {
                        id: "password",
                        value: password,
                    },
                    {
                        id: "email",
                        value: email,
                    },
                ],
            });
    } else {
        return request(app)
            .post("/auth/signin")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                formFields: [
                    {
                        id: "password",
                        value: password,
                    },
                    {
                        id: "email",
                        value: email,
                    },
                ],
            });
    }
};

module.exports.plessCreateCode = async function (app, { email, phoneNumber }, accessToken) {
    if (accessToken === undefined) {
        return request(app).post("/auth/signinup/code").send({
            email,
            phoneNumber,
        });
    } else {
        return request(app)
            .post("/auth/signinup/code")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                email,
                phoneNumber,
            })
            .expect(200);
    }
};

module.exports.plessResendCode = async function (app, code, accessToken) {
    if (accessToken === undefined) {
        return request(app).post("/auth/signinup/code/resend").send({
            preAuthSessionId: code.preAuthSessionId,
            deviceId: code.deviceId,
        });
    } else {
        return request(app)
            .post("/auth/signinup/code/resend")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                preAuthSessionId: code.preAuthSessionId,
                deviceId: code.deviceId,
            })
            .expect(200);
    }
};

module.exports.plessEmailSignInUp = async function (app, email, accessToken) {
    const code = await Passwordless.createCode({
        tenantId: "public",
        email,
    });

    if (accessToken === undefined) {
        return request(app).post("/auth/signinup/code/consume").send({
            preAuthSessionId: code.preAuthSessionId,
            userInputCode: code.userInputCode,
            deviceId: code.deviceId,
        });
    } else {
        return request(app)
            .post("/auth/signinup/code/consume")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                preAuthSessionId: code.preAuthSessionId,
                userInputCode: code.userInputCode,
                deviceId: code.deviceId,
            })
            .expect(200);
    }
};

module.exports.plessPhoneSigninUp = async function (app, phoneNumber, accessToken) {
    const code = await Passwordless.createCode({
        tenantId: "public",
        phoneNumber,
    });

    if (accessToken === undefined) {
        return request(app).post("/auth/signinup/code/consume").send({
            preAuthSessionId: code.preAuthSessionId,
            userInputCode: code.userInputCode,
            deviceId: code.deviceId,
        });
    } else {
        return request(app).post("/auth/signinup/code/consume").set("Authorization", `Bearer ${accessToken}`).send({
            preAuthSessionId: code.preAuthSessionId,
            userInputCode: code.userInputCode,
            deviceId: code.deviceId,
        });
    }
};

module.exports.tpSignInUp = async function (app, thirdPartyId, email, accessToken) {
    if (accessToken === undefined) {
        return request(app)
            .post("/auth/signinup")
            .send({
                thirdPartyId: thirdPartyId,
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                    redirectURIQueryParams: {
                        email: email,
                    },
                },
            });
    } else {
        return request(app)
            .post("/auth/signinup")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                thirdPartyId: thirdPartyId,
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                    redirectURIQueryParams: {
                        email: email,
                    },
                },
            });
    }
};

module.exports.getMfaInfo = async function (app, accessToken, statusCode = 200) {
    return request(app).put("/auth/mfa/info").set("Authorization", `Bearer ${accessToken}`).expect(statusCode);
};
