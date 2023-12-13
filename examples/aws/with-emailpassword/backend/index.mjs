import supertokens from "supertokens-node";
import { middleware } from "supertokens-node/framework/awsLambda";
import { getBackendConfig } from "./config.mjs";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import { handler as userHandler } from "./user.mjs";

supertokens.init(getBackendConfig());

export const handler = middy(
    middleware((event) => {
        if (event.path === "/user") {
            return userHandler(event);
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
