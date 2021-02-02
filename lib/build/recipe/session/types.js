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
exports.InputSchema = {
    type: "object",
    properties: {
        cookieSecure: TypeBoolean,
        cookieSameSite: TypeString,
        sessionExpiredStatusCode: TypeNumber,
        cookieDomain: TypeString,
        sessionRefreshFeature: {
            type: "object",
            properties: {
                disableDefaultImplementation: TypeBoolean,
            },
            additionalProperties: false,
        },
        errorHandlers: {
            type: "any",
        },
        enableAntiCsrf: TypeBoolean,
        faunadbSecret: TypeString,
        userCollectionName: TypeString,
        accessFaunadbTokenFromFrontend: TypeBoolean,
    },
    additionalProperties: false,
};
//# sourceMappingURL=types.js.map
