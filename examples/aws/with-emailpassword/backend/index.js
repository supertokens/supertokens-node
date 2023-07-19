let supertokens = require("supertokens-node");
let { middleware } = require("supertokens-node/framework/awsLambda/");
let { getBackendConfig } = require("./config");
let middy = require("@middy/core");
let cors = require("@middy/http-cors");
let { handler } = require("./user");

supertokens.init(getBackendConfig());

module.exports.handler = middy(
    middleware((event) => {
        if (event.path === "/user") {
            return handler(event);
        } else {
            return {
                body: JSON.stringify({
                    msg: "Hello!",
                }),
                statusCode: 200,
            };
        }
    })
)
    .use(
        cors({
            origin: getBackendConfig().appInfo.websiteDomain,
            credentials: true,
            headers: ["Content-Type", ...supertokens.getAllCORSHeaders()].join(", "),
            methods: "OPTIONS,POST,GET,PUT,DELETE",
        })
    )
    .onError((request) => {
        throw request.error;
    });
