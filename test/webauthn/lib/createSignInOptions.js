const request = require("supertest");
const express = require("express");
const { middleware, errorHandler } = require("../../../framework/express");

const createSignInOptions = async () => {
    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    const signInOptionsResponse = await new Promise((resolve, reject) =>
        request(app)
            .post("/auth/webauthn/options/signin")
            .send({})
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

    return signInOptionsResponse;
};

module.exports = createSignInOptions;
