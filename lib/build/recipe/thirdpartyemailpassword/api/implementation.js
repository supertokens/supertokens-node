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
const error_1 = require("../error");
const implementation_1 = require("../../emailpassword/api/implementation");
const implementation_2 = require("../../thirdparty/api/implementation");
class APIImplementation {
    constructor(recipeInstance, emailPasswordRecipeInstance, thirdPartyRecipeInstance) {
        this.emailExistsGET = (email, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.emailExistsGET(
                    email,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.generatePasswordResetTokenPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.generatePasswordResetTokenPOST(
                    formFields,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.passwordResetPOST = (formFields, token, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.passwordResetPOST(
                    formFields,
                    token,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signInPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signInPOST(
                    formFields,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signUpPOST = (formFields, options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signUpPOST(
                    formFields,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.authorisationUrlGET = (provider, options) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyImplementation === undefined || this.thirdPartyRecipeInstance === undefined) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: new Error("No thirdparty provider configured"),
                        },
                        this.recipeInstance
                    );
                }
                return this.thirdPartyImplementation.authorisationUrlGET(
                    provider,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.thirdPartyRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signInUpPOST = (provider, code, redirectURI, options) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyImplementation === undefined || this.thirdPartyRecipeInstance === undefined) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: new Error("No thirdparty provider configured"),
                        },
                        this.recipeInstance
                    );
                }
                return this.thirdPartyImplementation.signInUpPOST(
                    provider,
                    code,
                    redirectURI,
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.thirdPartyRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.signOutPOST = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signOutPOST(
                    Object.assign(Object.assign({}, options), {
                        recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
                    })
                );
            });
        this.recipeInstance = recipeInstance;
        this.emailPasswordRecipeInstance = emailPasswordRecipeInstance;
        this.thirdPartyRecipeInstance = thirdPartyRecipeInstance;
        this.emailPasswordImplementation = new implementation_1.default(emailPasswordRecipeInstance);
        if (thirdPartyRecipeInstance !== undefined) {
            this.thirdPartyImplementation = new implementation_2.default(thirdPartyRecipeInstance);
        }
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=implementation.js.map
