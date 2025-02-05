const request = require("supertest");
const express = require("express");

let { middleware, errorHandler } = require("../../../framework/express");

const getWebauthnLib = require("./getWebAuthnLib");

const createUser = async (rpId, rpName, origin) => {
    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    const email = `${Math.random().toString().slice(2)}@supertokens.com`;
    let registerOptionsResponse = await new Promise((resolve, reject) =>
        request(app)
            .post("/auth/webauthn/options/register")
            .send({
                email,
            })
            .expect(200)
            .end((err, res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(JSON.parse(res.text));
                }
            })
    );

    const { createCredential } = await getWebauthnLib();
    const credential = createCredential(registerOptionsResponse, {
        rpId,
        rpName,
        origin,
        userNotPresent: false,
        userNotVerified: false,
    });

    let signUpResponse = await new Promise((resolve, reject) =>
        request(app)
            .post("/auth/webauthn/signup")
            .send({
                credential,
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                shouldTryLinkingWithSessionUser: false,
            })
            .expect(200)
            .end((err, res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(JSON.parse(res.text));
                }
            })
    );

    return { email, signUpResponse, registerOptionsResponse, credential };
};

module.exports = createUser;
