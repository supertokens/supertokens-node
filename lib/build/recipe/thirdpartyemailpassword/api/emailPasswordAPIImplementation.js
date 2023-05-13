"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getIterfaceImpl(apiImplmentation) {
    var _a, _b, _c, _d, _e;
    return {
        emailExistsGET:
            (_a = apiImplmentation.emailPasswordEmailExistsGET) === null || _a === void 0
                ? void 0
                : _a.bind(apiImplmentation),
        generatePasswordResetTokenPOST:
            (_b = apiImplmentation.generatePasswordResetTokenPOST) === null || _b === void 0
                ? void 0
                : _b.bind(apiImplmentation),
        passwordResetPOST:
            (_c = apiImplmentation.passwordResetPOST) === null || _c === void 0 ? void 0 : _c.bind(apiImplmentation),
        signInPOST:
            (_d = apiImplmentation.emailPasswordSignInPOST) === null || _d === void 0
                ? void 0
                : _d.bind(apiImplmentation),
        signUpPOST:
            (_e = apiImplmentation.emailPasswordSignUpPOST) === null || _e === void 0
                ? void 0
                : _e.bind(apiImplmentation),
    };
}
exports.default = getIterfaceImpl;
