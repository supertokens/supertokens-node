"use strict";
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
function getRecipeInterface(passwordlessQuerier, thirdPartyQuerier, providers = []) {
    let originalPasswordlessImplementation = recipeImplementation_1.default(passwordlessQuerier);
    let originalThirdPartyImplementation = recipeImplementation_2.default(thirdPartyQuerier, providers);
    return {
        consumeCode: async function (input) {
            return originalPasswordlessImplementation.consumeCode.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        createCode: async function (input) {
            return originalPasswordlessImplementation.createCode.bind(passwordlessRecipeImplementation_1.default(this))(
                input
            );
        },
        createNewCodeForDevice: async function (input) {
            return originalPasswordlessImplementation.createNewCodeForDevice.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        listCodesByDeviceId: async function (input) {
            return originalPasswordlessImplementation.listCodesByDeviceId.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        listCodesByEmail: async function (input) {
            return originalPasswordlessImplementation.listCodesByEmail.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        listCodesByPhoneNumber: async function (input) {
            return originalPasswordlessImplementation.listCodesByPhoneNumber.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        listCodesByPreAuthSessionId: async function (input) {
            return originalPasswordlessImplementation.listCodesByPreAuthSessionId.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        revokeAllCodes: async function (input) {
            return originalPasswordlessImplementation.revokeAllCodes.bind(
                passwordlessRecipeImplementation_1.default(this)
            )(input);
        },
        revokeCode: async function (input) {
            return originalPasswordlessImplementation.revokeCode.bind(passwordlessRecipeImplementation_1.default(this))(
                input
            );
        },
        updatePasswordlessUser: async function (input) {
            let user = await __1.getUser(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            let inputUserIdIsPointingToPasswordlessUser =
                user.loginMethods.find((lM) => {
                    return (
                        lM.recipeId === "passwordless" &&
                        lM.recipeUserId.getAsString() === input.recipeUserId.getAsString()
                    );
                }) !== undefined;
            if (!inputUserIdIsPointingToPasswordlessUser) {
                throw new Error(
                    "Cannot update a user who signed up using third party login using updatePasswordlessUser."
                );
            }
            return originalPasswordlessImplementation.updateUser.bind(passwordlessRecipeImplementation_1.default(this))(
                input
            );
        },
        thirdPartySignInUp: async function (input) {
            return originalThirdPartyImplementation.signInUp.bind(thirdPartyRecipeImplementation_1.default(this))(
                input
            );
        },
        thirdPartyManuallyCreateOrUpdateUser: async function (input) {
            return originalThirdPartyImplementation.manuallyCreateOrUpdateUser.bind(
                thirdPartyRecipeImplementation_1.default(this)
            )(input);
        },
        thirdPartyGetProvider: async function (input) {
            return originalThirdPartyImplementation.getProvider.bind(thirdPartyRecipeImplementation_1.default(this))(
                input
            );
        },
    };
}
exports.default = getRecipeInterface;
