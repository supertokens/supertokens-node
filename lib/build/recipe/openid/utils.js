"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function validateAndNormaliseUserInput(appInfo, config) {
    let issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
    if (config !== undefined) {
        issuer = config.issuer;
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        issuer,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
