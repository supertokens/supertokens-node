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
        onInvalidClaim: TypeAny,
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
        claimsToAddOnCreation: TypeAny,
        defaultValidatorsForVerification: TypeAny,
        antiCsrf: TypeString,
        jwt: TypeAny,
        override: TypeAny,
    },
    additionalProperties: false,
};
class SessionClaim {
    constructor(key) {
        this.key = key;
    }
}
exports.SessionClaim = SessionClaim;
