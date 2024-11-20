import express from "express";
import cors from "cors";
import supertokens from "supertokens-node";
import { middleware, errorHandler } from "supertokens-node/framework/express";
import { apiPort, getWebsiteDomain, SuperTokensConfig } from "./config";
import { setupClient } from "./setupClient";

supertokens.init(SuperTokensConfig);

const app = express();

app.use(
    cors({
        origin: [getWebsiteDomain()],
        allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

// This exposes all the APIs from SuperTokens to the client.
app.use(middleware());

// In case of session related errors, this error handler
// returns 401 to the client.
app.use(errorHandler());

app.listen(3001, async () => {
    console.log("Setting up tenants");
    await setupClient();
    console.log("Tenants setup complete");
    console.log(`API Server listening on port ${apiPort}`);
});
