import { intercept, inject } from "@loopback/core";
import { post, response, RestApplication, RestBindings, MiddlewareContext } from "@loopback/rest";
import { middleware } from "../../../framework/loopback";
import { verifySession } from "../../../recipe/session/framework/loopback";
import Session from "../../../recipe/session";

class Create {
    constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
    @post("/create")
    @response(200)
    async handler() {
        await Session.createNewSession(this.ctx, this.ctx, "userId", {}, {});
        return {};
    }
}

class CreateThrowing {
    constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
    @post("/create-throw")
    @response(200)
    async handler() {
        await Session.createNewSession(this.ctx, this.ctx, "userId", {}, {});
        throw new Session.Error({
            message: "unauthorised",
            type: Session.Error.UNAUTHORISED,
        });
    }
}
class Verify {
    constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
    @post("/session/verify")
    @intercept(verifySession())
    @response(200)
    handler() {
        return {
            user: ((this.ctx as any).session as Session.SessionContainer).getUserId(),
        };
    }
}

class VerifyOptionalCSRF {
    constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
    @post("/session/verify/optionalCSRF")
    @intercept(verifySession({ antiCsrfCheck: false }))
    @response(200)
    handler() {
        return {
            user: ((this.ctx as any).session as Session.SessionContainer).getUserId(),
        };
    }
}

class Revoke {
    constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
    @post("/session/revoke")
    @intercept(verifySession())
    @response(200)
    async handler() {
        await ((this.ctx as any).session as Session.SessionContainer).revokeSession();
        return {};
    }
}

let app = new RestApplication({
    rest: {
        port: 9876,
    },
});

if (process.env.TEST_SKIP_MIDDLEWARE !== "true") {
    app.middleware(middleware);
}
app.controller(Create);
app.controller(CreateThrowing);
app.controller(Verify);
app.controller(Revoke);
app.controller(VerifyOptionalCSRF);
module.exports = app;
