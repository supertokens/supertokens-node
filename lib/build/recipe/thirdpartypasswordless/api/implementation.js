"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const implementation_1 = require("../../passwordless/api/implementation");
const implementation_2 = require("../../thirdparty/api/implementation");
const passwordlessAPIImplementation_1 = require("./passwordlessAPIImplementation");
const thirdPartyAPIImplementation_1 = require("./thirdPartyAPIImplementation");
function getAPIImplementation() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let passwordlessImplementation = implementation_1.default();
    let thirdPartyImplementation = implementation_2.default();
    return {
        consumeCodePOST:
            (_a = passwordlessImplementation.consumeCodePOST) === null || _a === void 0
                ? void 0
                : _a.bind(passwordlessAPIImplementation_1.default(this)),
        createCodePOST:
            (_b = passwordlessImplementation.createCodePOST) === null || _b === void 0
                ? void 0
                : _b.bind(passwordlessAPIImplementation_1.default(this)),
        passwordlessUserEmailExistsGET:
            (_c = passwordlessImplementation.emailExistsGET) === null || _c === void 0
                ? void 0
                : _c.bind(passwordlessAPIImplementation_1.default(this)),
        passwordlessUserPhoneNumberExistsGET:
            (_d = passwordlessImplementation.phoneNumberExistsGET) === null || _d === void 0
                ? void 0
                : _d.bind(passwordlessAPIImplementation_1.default(this)),
        resendCodePOST:
            (_e = passwordlessImplementation.resendCodePOST) === null || _e === void 0
                ? void 0
                : _e.bind(passwordlessAPIImplementation_1.default(this)),
        authorisationUrlGET:
            (_f = thirdPartyImplementation.authorisationUrlGET) === null || _f === void 0
                ? void 0
                : _f.bind(thirdPartyAPIImplementation_1.default(this)),
        thirdPartySignInUpPOST:
            (_g = thirdPartyImplementation.signInUpPOST) === null || _g === void 0
                ? void 0
                : _g.bind(thirdPartyAPIImplementation_1.default(this)),
        appleRedirectHandlerPOST:
            (_h = thirdPartyImplementation.appleRedirectHandlerPOST) === null || _h === void 0
                ? void 0
                : _h.bind(thirdPartyAPIImplementation_1.default(this)),
    };
}
exports.default = getAPIImplementation;
