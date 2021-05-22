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
class APIImplementation {
    constructor(apiImplmentation) {
        this.emailExistsGET = (email, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.apiImplmentation.emailExistsGET(email, options);
            });
        this.generatePasswordResetTokenPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.apiImplmentation.generatePasswordResetTokenPOST(formFields, options);
            });
        this.passwordResetPOST = (formFields, token, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.apiImplmentation.passwordResetPOST(formFields, token, options);
            });
        this.signInPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.apiImplmentation.signInPOST(formFields, options);
            });
        this.signUpPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.apiImplmentation.signUpPOST(formFields, options);
            });
        this.signOutPOST = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.apiImplmentation.signOutPOST(options);
            });
        this.apiImplmentation = apiImplmentation;
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=emailPasswordAPIImplementation.js.map
