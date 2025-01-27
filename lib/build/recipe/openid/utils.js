"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormaliseUserInput = void 0;
function validateAndNormaliseUserInput(config) {
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
