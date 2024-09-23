import { Hono } from "hono";
import { cors } from "hono/cors";
import supertokens from "supertokens-node";
import { middleware } from "./middleware";
import { getWebsiteDomain, SuperTokensConfig } from "./config";
import type { PageConfig } from "next";

export const config: PageConfig = {
    runtime: "edge",
};

supertokens.init(SuperTokensConfig);

const app = new Hono();

app.use("*", async (c, next) => {
    return await cors({
        origin: getWebsiteDomain(),
        credentials: true,
        allowHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    })(c, next);
});

// This exposes all the APIs from SuperTokens to the client.
// and adds the session to the request object if one exists.
app.use("*", middleware());

// An example API that requires session verification
app.get("/sessioninfo", (c) => {
    let session = c.req.session;
    if (!session) {
        return c.text("Unauthorized", 401);
    }
    return c.json({
        sessionHandle: session!.getHandle(),
        userId: session!.getUserId(),
        accessTokenPayload: session!.getAccessTokenPayload(),
    });
});

app.get("/", (c) => {
    return c.json({
        "message": "Hello from Supertokens"
    })
})

export default app;
