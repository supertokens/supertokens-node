import supertokens from "supertokens-node";
import { getBackendConfig } from "./config.mjs";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import { verifySession } from "supertokens-node/recipe/session/framework/awsLambda";

supertokens.init(getBackendConfig());

const lambdaHandler = async (event) => {
    return {
        body: JSON.stringify({
            sessionHandle: event.session.getHandle(),
            userId: event.session.getUserId(),
            accessTokenPayload: event.session.getAccessTokenPayload(),
        }),
        statusCode: 200,
    };
};

export const handler = middy(verifySession(lambdaHandler))
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
