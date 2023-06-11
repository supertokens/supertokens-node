"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getIterfaceImpl(apiImplmentation) {
    var _a, _b, _c, _d, _e;
    return {
        emailExistsGET:
            (_a = apiImplmentation.passwordlessUserEmailExistsGET) === null || _a === void 0
                ? void 0
                : _a.bind(apiImplmentation),
        consumeCodePOST:
            (_b = apiImplmentation.consumeCodePOST) === null || _b === void 0 ? void 0 : _b.bind(apiImplmentation),
        createCodePOST:
            (_c = apiImplmentation.createCodePOST) === null || _c === void 0 ? void 0 : _c.bind(apiImplmentation),
        phoneNumberExistsGET:
            (_d = apiImplmentation.passwordlessUserPhoneNumberExistsGET) === null || _d === void 0
                ? void 0
                : _d.bind(apiImplmentation),
        resendCodePOST:
            (_e = apiImplmentation.resendCodePOST) === null || _e === void 0 ? void 0 : _e.bind(apiImplmentation),
    };
}
exports.default = getIterfaceImpl;
