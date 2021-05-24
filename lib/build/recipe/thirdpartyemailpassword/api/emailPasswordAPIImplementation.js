"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
function getIterfaceImpl(apiImplmentation) {
    const signInUpPOST = apiImplmentation.signInUpPOST;
    return {
        emailExistsGET: apiImplmentation.emailExistsGET,
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST,
        passwordResetPOST: apiImplmentation.passwordResetPOST,
        signInPOST:
            signInUpPOST === undefined
                ? undefined
                : (formFields, options) =>
                      __awaiter(this, void 0, void 0, function* () {
                          return yield signInUpPOST({
                              type: "emailpassword",
                              formFields,
                              options,
                              isSignIn: true,
                          });
                      }),
        signOutPOST: apiImplmentation.signOutPOST,
        signUpPOST:
            signInUpPOST === undefined
                ? undefined
                : (formFields, options) =>
                      __awaiter(this, void 0, void 0, function* () {
                          return yield signInUpPOST({
                              type: "emailpassword",
                              formFields,
                              options,
                              isSignIn: false,
                          });
                      }),
    };
}
exports.default = getIterfaceImpl;
//# sourceMappingURL=emailPasswordAPIImplementation.js.map
