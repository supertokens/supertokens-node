"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
function validateAndNormaliseUserInput(_, __, config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function getUserIdTypeAsString(userIdType) {
    if (userIdType === index_1.UserIdType.SUPERTOKENS) {
        return "SUPERTOKENS";
    }
    if (userIdType === index_1.UserIdType.EXTERNAL) {
        return "EXTERNAL";
    }
    return "ANY";
}
exports.getUserIdTypeAsString = getUserIdTypeAsString;
