"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getIterfaceImpl(apiImplmentation) {
    return {
        emailExistsGET: apiImplmentation.emailExistsGET,
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST,
        passwordResetPOST: apiImplmentation.passwordResetPOST,
        signInPOST: apiImplmentation.signInPOST,
        signOutPOST: apiImplmentation.signOutPOST,
        signUpPOST: apiImplmentation.signUpPOST,
    };
}
exports.default = getIterfaceImpl;
//# sourceMappingURL=emailPasswordAPIImplementation.js.map
