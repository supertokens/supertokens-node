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
    constructor(recipeInstance) {
        this.emailExistsGET = (email, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.apiImpl.emailExistsGET(
                    email,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.generatePasswordResetTokenPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.apiImpl.generatePasswordResetTokenPOST(
                    formFields,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.passwordResetPOST = (formFields, token, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.apiImpl.passwordResetPOST(
                    formFields,
                    token,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signInPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.apiImpl.signInPOST(
                    formFields,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signUpPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.apiImpl.signUpPOST(
                    formFields,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signOutPOST = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.recipeInstance.apiImpl.signOutPOST(
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=emailPasswordAPIImplementation.js.map
