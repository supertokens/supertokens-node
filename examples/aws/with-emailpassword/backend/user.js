let supertokens = require("supertokens-node");
let { middleware } = require("supertokens-node/framework/awsLambda/");
let { getBackendConfig } = require("./config");
let middy = require("@middy/core");
let cors = require("@middy/http-cors");
let { verifySession } = require("supertokens-node/recipe/session/framework/awsLambda");

supertokens.init(getBackendConfig());

const handler = async (event) => {
    let count = 0;
    let currPayload = event.session.getAccessTokenPayload();
    if (currPayload.count !== undefined) {
        count = currPayload.count;
    }
    await event.session.mergeIntoAccessTokenPayload({
        count: count + 1,
    });
    return {
        body: JSON.stringify({
            sessionHandle: event.session.getHandle(),
            userId: event.session.getUserId(),
            accessTokenPayload: event.session.getAccessTokenPayload(),
        }),
        statusCode: 200,
    };
};

module.exports.handler = middy(verifySession(handler))
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
