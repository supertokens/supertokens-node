"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const implementation_1 = require("../../emailpassword/api/implementation");
const implementation_2 = require("../../thirdparty/api/implementation");
function getAPIImplementation() {
    var _a, _b, _c, _d, _e, _f, _g;
    let emailPasswordImplementation = implementation_1.default();
    let thirdPartyImplementation = implementation_2.default();
    return {
        emailExistsGET:
            (_a = emailPasswordImplementation.emailExistsGET) === null || _a === void 0
                ? void 0
                : _a.bind(emailPasswordImplementation),
        authorisationUrlGET:
            (_b = thirdPartyImplementation.authorisationUrlGET) === null || _b === void 0
                ? void 0
                : _b.bind(thirdPartyImplementation),
        emailPasswordSignInPOST:
            (_c = emailPasswordImplementation.signInPOST) === null || _c === void 0
                ? void 0
                : _c.bind(emailPasswordImplementation),
        emailPasswordSignUpPOST:
            (_d = emailPasswordImplementation.signUpPOST) === null || _d === void 0
                ? void 0
                : _d.bind(emailPasswordImplementation),
        generatePasswordResetTokenPOST:
            (_e = emailPasswordImplementation.generatePasswordResetTokenPOST) === null || _e === void 0
                ? void 0
                : _e.bind(emailPasswordImplementation),
        passwordResetPOST:
            (_f = emailPasswordImplementation.passwordResetPOST) === null || _f === void 0
                ? void 0
                : _f.bind(emailPasswordImplementation),
        thirdPartySignInUpPOST:
            (_g = thirdPartyImplementation.signInUpPOST) === null || _g === void 0
                ? void 0
                : _g.bind(thirdPartyImplementation),
    };
}
exports.default = getAPIImplementation;
