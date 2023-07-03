import Hapi from "@hapi/hapi";
import supertokens from "supertokens-node";
import { getWebsiteDomain, SuperTokensConfig } from "./config";
import { plugin } from "supertokens-node/framework/hapi";
import { verifySession } from "supertokens-node/recipe/session/framework/hapi";
import { SessionRequest } from "supertokens-node/framework/hapi";

supertokens.init(SuperTokensConfig);
const init = async () => {
    const server = Hapi.server({
        port: 3001,
        routes: {
            cors: {
                origin: [getWebsiteDomain()],
                additionalHeaders: [...supertokens.getAllCORSHeaders()],
                credentials: true,
            },
        },
        host: "localhost",
    });

    server.route({
        method: "GET",
        path: "/sessioninfo",
        options: {
            pre: [
                {
                    method: verifySession(),
                },
            ],
        },
        handler: async (req: SessionRequest, res) => {
            let session = req.session;
            return {
                sessionHandle: session!.getHandle(),
                userId: session!.getUserId(),
                accessTokenPayload: session!.getAccessTokenPayload(),
            };
        },
    });

    await server.register(plugin);

    await server.start();
    console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
    console.log(err);
    process.exit(1);
});

init();
