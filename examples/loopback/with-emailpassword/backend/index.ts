import { getWebsiteDomain, SuperTokensConfig } from "./config";
import { inject, intercept } from "@loopback/core";
import { RestBindings, MiddlewareContext, get, response, RestApplication } from "@loopback/rest";
import { verifySession } from "supertokens-node/recipe/session/framework/loopback";
import { SessionContext } from "supertokens-node/framework/loopback";
import supertokens from "supertokens-node";
import { middleware } from "supertokens-node/framework/loopback";

supertokens.init(SuperTokensConfig);

let app = new RestApplication({
    rest: {
        cors: {
            origin: getWebsiteDomain(),
            allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
            credentials: true,
        },
        port: 3001,
    },
});

app.middleware(middleware);

class SessionController {
    constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
    @get("/sessioninfo")
    @intercept(verifySession())
    @response(200)
    handler() {
        let session = (this.ctx as SessionContext).session;
        return {
            sessionHandle: session!.getHandle(),
            userId: session!.getUserId(),
            accessTokenPayload: session!.getAccessTokenPayload(),
        };
    }
}

app.controller(SessionController);

(async () => {
    await app.init();
    // await app.boot();
    await app.start();
    const url = app.restServer.url;
    console.log(`Server is running at ${url}`);
})();
