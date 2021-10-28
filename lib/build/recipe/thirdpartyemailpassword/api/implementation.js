"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const implementation_1 = require("../../emailpassword/api/implementation");
const implementation_2 = require("../../thirdparty/api/implementation");
function getAPIImplementation() {
    let emailPasswordImplementation = implementation_1.default();
    let thirdPartyImplementation = implementation_2.default();
    return {
        emailExistsGET: emailPasswordImplementation.emailExistsGET,
        authorisationUrlGET: thirdPartyImplementation.authorisationUrlGET,
        emailPasswordSignInPOST: emailPasswordImplementation.signInPOST,
        emailPasswordSignUpPOST: emailPasswordImplementation.signUpPOST,
        generatePasswordResetTokenPOST: emailPasswordImplementation.generatePasswordResetTokenPOST,
        passwordResetPOST: emailPasswordImplementation.passwordResetPOST,
        thirdPartySignInUpPOST: thirdPartyImplementation.signInUpPOST,
    };
}
exports.default = getAPIImplementation;
