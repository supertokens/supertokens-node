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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeImplementation_1 = __importDefault(require("../../passwordless/recipeImplementation"));
const recipeImplementation_2 = __importDefault(require("../../thirdparty/recipeImplementation"));
const passwordlessRecipeImplementation_1 = __importDefault(require("./passwordlessRecipeImplementation"));
const thirdPartyRecipeImplementation_1 = __importDefault(require("./thirdPartyRecipeImplementation"));
const __1 = require("../../../");
function getRecipeInterface(passwordlessQuerier, thirdPartyQuerier) {
    let originalPasswordlessImplementation = recipeImplementation_1.default(passwordlessQuerier);
    let originalThirdPartyImplementation;
    if (thirdPartyQuerier !== undefined) {
        originalThirdPartyImplementation = recipeImplementation_2.default(thirdPartyQuerier);
    }
    return {
        consumeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.consumeCode.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        createCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.createCode.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        createNewCodeForDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.createNewCodeForDevice.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        listCodesByDeviceId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.listCodesByDeviceId.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        listCodesByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.listCodesByEmail.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        listCodesByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.listCodesByPhoneNumber.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        listCodesByPreAuthSessionId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.listCodesByPreAuthSessionId.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        revokeAllCodes: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.revokeAllCodes.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        revokeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return originalPasswordlessImplementation.revokeCode.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        updatePasswordlessUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield __1.getUser(input.userId, input.userContext);
                if (user === undefined) {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                } else if (user.thirdParty.length > 0) {
                    // TODO: the above if condition is wrong.
                    throw new Error(
                        "Cannot update passwordless user info for those who signed up using third party login."
                    );
                }
                return originalPasswordlessImplementation.updateUser.bind(
                    passwordlessRecipeImplementation_1.default(this)
                )(input);
            });
        },
        thirdPartySignInUp: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (originalThirdPartyImplementation === undefined) {
                    throw new Error("No thirdparty provider configured");
                }
                return originalThirdPartyImplementation.signInUp.bind(thirdPartyRecipeImplementation_1.default(this))(
                    input
                );
            });
        },
        createNewOrUpdateEmailOfThirdPartyRecipeUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (originalThirdPartyImplementation === undefined) {
                    throw new Error("No thirdparty provider configured");
                }
                return originalThirdPartyImplementation.createNewOrUpdateEmailOfRecipeUser.bind(
                    thirdPartyRecipeImplementation_1.default(this)
                )(input);
            });
        },
    };
}
exports.default = getRecipeInterface;
