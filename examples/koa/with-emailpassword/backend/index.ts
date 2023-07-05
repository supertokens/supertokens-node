import Koa from "koa";
import cors from "@koa/cors";
import supertokens from "supertokens-node";
import { middleware } from "supertokens-node/framework/koa";
import { SuperTokensConfig, getWebsiteDomain } from "./config";
import KoaRouter from "koa-router";
import { verifySession } from "supertokens-node/recipe/session/framework/koa";
import { SessionContext } from "supertokens-node/framework/koa";

supertokens.init(SuperTokensConfig);

let app = new Koa();

let router = new KoaRouter();

app.use(
    cors({
        origin: getWebsiteDomain(),
        allowHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        credentials: true,
    })
);

app.use(middleware());

router.get("/sessioninfo", verifySession(), (ctx: SessionContext, next) => {
    let userId = ctx.session!.getUserId();
    let sessionHandle = ctx.session!.getHandle();
    let accessTokenPayload = ctx.session?.getAccessTokenPayload();
    ctx.body = JSON.stringify({ userId, sessionHandle, accessTokenPayload }, null, 4);
});

app.use(router.routes());

if (!module.parent) app.listen(3001, () => console.log("API Server listening on port 3001"));
