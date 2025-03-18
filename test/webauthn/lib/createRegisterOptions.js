const request = require("supertest");
const express = require("express");
const { middleware, errorHandler } = require("../../../framework/express");

const createRegisterOptions = async (email = `${Math.random().toString().slice(2)}@supertokens.com`) => {
    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    const registerOptionsResponse = await new Promise((resolve, reject) =>
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

    return registerOptionsResponse;
};

module.exports = createRegisterOptions;
