"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getIterfaceImpl(apiImplmentation) {
    return {
        emailExistsGET: apiImplmentation.emailExistsGET,
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST,
        passwordResetPOST: apiImplmentation.passwordResetPOST,
        signInPOST: apiImplmentation.emailPasswordSignInPOST,
        signUpPOST: apiImplmentation.emailPasswordSignUpPOST,
    };
}
exports.default = getIterfaceImpl;
