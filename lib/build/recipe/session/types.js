"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TypeString = {
    type: "string",
};
const TypeBoolean = {
    type: "boolean",
};
const TypeNumber = {
    type: "number",
};
const TypeAny = {
    type: "any",
};
exports.InputSchemaErrorHandlers = {
    type: "object",
    properties: {
        onUnauthorised: TypeAny,
        onTokenTheftDetected: TypeAny,
        onMissingClaim: TypeAny,
    },
    additionalProperties: false,
};
exports.InputSchema = {
    type: "object",
    properties: {
        cookieSecure: TypeBoolean,
        cookieSameSite: TypeString,
        sessionExpiredStatusCode: TypeNumber,
        cookieDomain: TypeString,
        errorHandlers: exports.InputSchemaErrorHandlers,
        antiCsrf: TypeString,
        jwt: TypeAny,
        override: TypeAny,
    },
    additionalProperties: false,
};
class SessionClaim {
    constructor(id) {
        this.id = id;
    }
}
exports.SessionClaim = SessionClaim;
