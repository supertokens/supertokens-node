const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let Passwordless = require("../../lib/build/recipe/passwordless");
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
        return await new Promise((resolve) =>
            request(app)
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
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
    } else {
        return await new Promise((resolve) =>
            request(app)
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
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
    }
};

module.exports.epSignIn = async function (app, email, password, accessToken) {
    if (accessToken === undefined) {
        return await new Promise((resolve) =>
            request(app)
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
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
    } else {
        return await new Promise((resolve) =>
            request(app)
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
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
    }
};

module.exports.plessEmailSignInUp = async function (app, email, accessToken) {
    const code = await Passwordless.createCode({
        tenantId: "public",
        email,
    });

    if (accessToken === undefined) {
        return await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
    } else {
        return await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
    }
};

module.exports.plessPhoneSigninUp = async function (app, phoneNumber, accessToken) {
    const code = await Passwordless.createCode({
        tenantId: "public",
        phoneNumber,
    });

    if (accessToken === undefined) {
        return await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
    } else {
        return await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signinup/code/consume")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
    }
};

module.exports.tpSignInUp = async function (app, thirdPartyId, email, accessToken) {
    if (accessToken === undefined) {
        return await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: thirdPartyId,
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            email: email,
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
    } else {
        await new Promise((resolve) =>
            request(app)
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
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
    }
};

module.exports.getMfaInfo = async function (app, accessToken) {
    return await new Promise((resolve) =>
        request(app)
            .get("/auth/mfa/info")
            .set("Authorization", `Bearer ${accessToken}`)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            })
    );
};
