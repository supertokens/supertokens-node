"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getIterfaceImpl(apiImplmentation) {
    var _a, _b, _c;
    return {
        authorisationUrlGET:
            (_a = apiImplmentation.authorisationUrlGET) === null || _a === void 0 ? void 0 : _a.bind(apiImplmentation),
        appleRedirectHandlerPOST:
            (_b = apiImplmentation.appleRedirectHandlerPOST) === null || _b === void 0
                ? void 0
                : _b.bind(apiImplmentation),
        signInUpPOST:
            (_c = apiImplmentation.thirdPartySignInUpPOST) === null || _c === void 0
                ? void 0
                : _c.bind(apiImplmentation),
    };
}
exports.default = getIterfaceImpl;
