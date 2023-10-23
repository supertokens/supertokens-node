"use strict";
var __decorate =
    (this && this.__decorate) ||
    function (decorators, target, key, desc) {
        var c = arguments.length,
            r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
            d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
            r = Reflect.decorate(decorators, target, key, desc);
        else
            for (var i = decorators.length - 1; i >= 0; i--)
                if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
var __param =
    (this && this.__param) ||
    function (paramIndex, decorator) {
        return function (target, key) {
            decorator(target, key, paramIndex);
        };
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@loopback/core");
const rest_1 = require("@loopback/rest");
const loopback_1 = require("../../../framework/loopback");
const loopback_2 = require("../../../recipe/session/framework/loopback");
const session_1 = __importDefault(require("../../../recipe/session"));
const supertokens_1 = __importDefault(require("../../.."));
let Create = class Create {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async handler() {
        await session_1.default.createNewSession(
            this.ctx,
            this.ctx,
            "public",
            supertokens_1.convertToRecipeUserId("userId"),
            {},
            {}
        );
        return {};
    }
};
__decorate([rest_1.post("/create"), rest_1.response(200)], Create.prototype, "handler", null);
Create = __decorate([__param(0, core_1.inject(rest_1.RestBindings.Http.CONTEXT))], Create);
let CreateThrowing = class CreateThrowing {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async handler() {
        await session_1.default.createNewSession(
            this.ctx,
            this.ctx,
            "public",
            supertokens_1.convertToRecipeUserId("userId"),
            {},
            {}
        );
        throw new session_1.default.Error({
            message: "unauthorised",
            type: session_1.default.Error.UNAUTHORISED,
        });
    }
};
__decorate([rest_1.post("/create-throw"), rest_1.response(200)], CreateThrowing.prototype, "handler", null);
CreateThrowing = __decorate([__param(0, core_1.inject(rest_1.RestBindings.Http.CONTEXT))], CreateThrowing);
let Verify = class Verify {
    constructor(ctx) {
        this.ctx = ctx;
    }
    handler() {
        return {
            user: this.ctx.session.getUserId(),
        };
    }
};
__decorate(
    [rest_1.post("/session/verify"), core_1.intercept(loopback_2.verifySession()), rest_1.response(200)],
    Verify.prototype,
    "handler",
    null
);
Verify = __decorate([__param(0, core_1.inject(rest_1.RestBindings.Http.CONTEXT))], Verify);
let MultipleMerge = class MultipleMerge {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async handler() {
        const session = this.ctx.session;
        await session.mergeIntoAccessTokenPayload({ test1: Date.now() });
        await session.mergeIntoAccessTokenPayload({ test2: Date.now() });
        await session.mergeIntoAccessTokenPayload({ test3: Date.now() });
        return "";
    }
};
__decorate(
    [rest_1.post("/session/multipleMerge"), core_1.intercept(loopback_2.verifySession()), rest_1.response(200)],
    MultipleMerge.prototype,
    "handler",
    null
);
MultipleMerge = __decorate([__param(0, core_1.inject(rest_1.RestBindings.Http.CONTEXT))], MultipleMerge);
let VerifyOptionalCSRF = class VerifyOptionalCSRF {
    constructor(ctx) {
        this.ctx = ctx;
    }
    handler() {
        return {
            user: this.ctx.session.getUserId(),
        };
    }
};
__decorate(
    [
        rest_1.post("/session/verify/optionalCSRF"),
        core_1.intercept(loopback_2.verifySession({ antiCsrfCheck: false })),
        rest_1.response(200),
    ],
    VerifyOptionalCSRF.prototype,
    "handler",
    null
);
VerifyOptionalCSRF = __decorate([__param(0, core_1.inject(rest_1.RestBindings.Http.CONTEXT))], VerifyOptionalCSRF);
let Revoke = class Revoke {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async handler() {
        await this.ctx.session.revokeSession();
        return {};
    }
};
__decorate(
    [rest_1.post("/session/revoke"), core_1.intercept(loopback_2.verifySession()), rest_1.response(200)],
    Revoke.prototype,
    "handler",
    null
);
Revoke = __decorate([__param(0, core_1.inject(rest_1.RestBindings.Http.CONTEXT))], Revoke);
let app = new rest_1.RestApplication({
    rest: {
        port: 9876,
    },
});
if (process.env.TEST_SKIP_MIDDLEWARE !== "true") {
    app.middleware(loopback_1.middleware);
}
app.controller(Create);
app.controller(CreateThrowing);
app.controller(Verify);
app.controller(MultipleMerge);
app.controller(Revoke);
app.controller(VerifyOptionalCSRF);
module.exports = app;
