"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../emailpassword/types");
const TypeString = {
    type: "string",
};
const TypeBoolean = {
    type: "boolean",
};
const TypeAny = {
    type: "any",
};
const InputSessionFeatureSchema = {
    type: "object",
    properties: {
        setJwtPayload: TypeAny,
        setSessionData: TypeAny,
    },
    additionalProperties: false,
};
const InputSignUpSchema = {
    type: "object",
    properties: {
        formFields: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: TypeString,
                    validate: TypeAny,
                    optional: TypeBoolean,
                },
                required: ["id"],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
};
const InputEmailVerificationFeatureSchema = {
    type: "object",
    properties: {
        getEmailVerificationURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
    },
    additionalProperties: false,
};
const InputProvidersSchema = {
    type: "array",
};
exports.InputSchema = {
    sessionFeature: InputSessionFeatureSchema,
    signUpFeature: InputSignUpSchema,
    providers: InputProvidersSchema,
    resetPasswordUsingTokenFeature: types_1.InputResetPasswordUsingTokenFeatureSchema,
    emailVerificationFeature: InputEmailVerificationFeatureSchema,
    override: TypeAny,
};
//# sourceMappingURL=types.js.map
