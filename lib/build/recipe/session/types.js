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
        enableJWT: TypeBoolean,
        jwtKey: TypeString,
        override: TypeAny,
    },
    additionalProperties: false,
};
