import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { errorHandler, SessionRequest } from "supertokens-node/framework/fastify";
import { getWebsiteDomain, SuperTokensConfig } from "./config";

import cors from "@fastify/cors";
import supertokens from "supertokens-node";
import { plugin } from "supertokens-node/framework/fastify";
import formDataPlugin from "@fastify/formbody";

import fastifyImport from "fastify";

let fastify = fastifyImport();

supertokens.init(SuperTokensConfig);

// ...other middlewares
fastify.register(cors, {
    origin: getWebsiteDomain(),
    allowedHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
    credentials: true,
});

fastify.register(formDataPlugin);
fastify.register(plugin);

fastify.setErrorHandler(errorHandler());

fastify.route({
    method: "GET",
    url: "/sessioninfo",
    schema: {
        response: {
            200: {
                type: "object",
                properties: {
                    sessionHandle: { type: "string" },
                    userId: { type: "string" },
                    accessTokenPayload: { type: "object" },
                },
            },
        },
    },
    // @ts-ignore
    preHandler: verifySession(),
    handler: async (req: SessionRequest, _) => {
        let session = req.session;
        return {
            sessionHandle: session!.getHandle(),
            userId: session!.getUserId(),
            accessTokenPayload: session!.getAccessTokenPayload(),
        };
    },
});

fastify.listen({ port: 3001 });
