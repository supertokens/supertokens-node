import { superTokensNextWrapper } from "supertokens-node/nextjs";
import { middleware } from "supertokens-node/framework/express";
import { NextApiRequest, NextApiResponse } from "next";
import supertokens from "supertokens-node";
import { backendConfig } from "../../../config/backendConfig";

supertokens.init(backendConfig());

export default async function superTokens(req: NextApiRequest, res: NextApiResponse) {
    await superTokensNextWrapper(
        async (next) => {
            // This is needed for production deployments with Vercel
            // It'll be overwritten by the middleware in some cases (the jwks.json endpoint)
            res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");

            await middleware()(req as any, res as any, next);
        },
        req,
        res
    );
    if (!res.writableEnded) {
        res.status(404).send("Not found");
    }
}
