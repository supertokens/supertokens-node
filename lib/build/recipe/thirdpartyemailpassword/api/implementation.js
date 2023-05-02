"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const implementation_1 = __importDefault(require("../../emailpassword/api/implementation"));
const implementation_2 = __importDefault(require("../../thirdparty/api/implementation"));
const emailPasswordAPIImplementation_1 = __importDefault(require("./emailPasswordAPIImplementation"));
const thirdPartyAPIImplementation_1 = __importDefault(require("./thirdPartyAPIImplementation"));
function getAPIImplementation() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    let emailPasswordImplementation = implementation_1.default();
    let thirdPartyImplementation = implementation_2.default();
    return {
        emailPasswordEmailExistsGET: (_a = emailPasswordImplementation.emailExistsGET) === null || _a === void 0 ? void 0 : _a.bind(emailPasswordAPIImplementation_1.default(this)),
        authorisationUrlGET: (_b = thirdPartyImplementation.authorisationUrlGET) === null || _b === void 0 ? void 0 : _b.bind(thirdPartyAPIImplementation_1.default(this)),
        emailPasswordSignInPOST: (_c = emailPasswordImplementation.signInPOST) === null || _c === void 0 ? void 0 : _c.bind(emailPasswordAPIImplementation_1.default(this)),
        emailPasswordSignUpPOST: (_d = emailPasswordImplementation.signUpPOST) === null || _d === void 0 ? void 0 : _d.bind(emailPasswordAPIImplementation_1.default(this)),
        generatePasswordResetTokenPOST: (_e = emailPasswordImplementation.generatePasswordResetTokenPOST) === null || _e === void 0 ? void 0 : _e.bind(emailPasswordAPIImplementation_1.default(this)),
        linkEmailPasswordAccountToExistingAccountPOST: (_f = emailPasswordImplementation.linkAccountToExistingAccountPOST) === null || _f === void 0 ? void 0 : _f.bind(emailPasswordAPIImplementation_1.default(this)),
        linkThirdPartyAccountToExistingAccountPOST: (_g = thirdPartyImplementation.linkAccountToExistingAccountPOST) === null || _g === void 0 ? void 0 : _g.bind(thirdPartyAPIImplementation_1.default(this)),
        passwordResetPOST: (_h = emailPasswordImplementation.passwordResetPOST) === null || _h === void 0 ? void 0 : _h.bind(emailPasswordAPIImplementation_1.default(this)),
        thirdPartySignInUpPOST: (_j = thirdPartyImplementation.signInUpPOST) === null || _j === void 0 ? void 0 : _j.bind(thirdPartyAPIImplementation_1.default(this)),
        appleRedirectHandlerPOST: (_k = thirdPartyImplementation.appleRedirectHandlerPOST) === null || _k === void 0 ? void 0 : _k.bind(thirdPartyAPIImplementation_1.default(this)),
    };
}
exports.default = getAPIImplementation;
