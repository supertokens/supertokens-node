"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeImplementation_1 = __importDefault(require("../../emailpassword/recipeImplementation"));
const recipeImplementation_2 = __importDefault(require("../../thirdparty/recipeImplementation"));
const emailPasswordRecipeImplementation_1 = __importDefault(require("./emailPasswordRecipeImplementation"));
const thirdPartyRecipeImplementation_1 = __importDefault(require("./thirdPartyRecipeImplementation"));
const __1 = require("../../../");
function getRecipeInterface(emailPasswordQuerier, getEmailPasswordConfig, thirdPartyQuerier, providers = []) {
    let originalEmailPasswordImplementation = recipeImplementation_1.default(
        emailPasswordQuerier,
        getEmailPasswordConfig
    );
    let originalThirdPartyImplementation = recipeImplementation_2.default(thirdPartyQuerier, providers);
    return {
        createNewEmailPasswordRecipeUser: async function (input) {
            return await originalEmailPasswordImplementation.createNewRecipeUser.bind(
                emailPasswordRecipeImplementation_1.default(this)
            )(input);
        },
        emailPasswordSignUp: async function (input) {
            return await originalEmailPasswordImplementation.signUp.bind(
                emailPasswordRecipeImplementation_1.default(this)
            )(input);
        },
        emailPasswordSignIn: async function (input) {
            return originalEmailPasswordImplementation.signIn.bind(emailPasswordRecipeImplementation_1.default(this))(
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
        createResetPasswordToken: async function (input) {
            return originalEmailPasswordImplementation.createResetPasswordToken.bind(
                emailPasswordRecipeImplementation_1.default(this)
            )(input);
        },
        consumePasswordResetToken: async function (input) {
            return originalEmailPasswordImplementation.consumePasswordResetToken.bind(
                emailPasswordRecipeImplementation_1.default(this)
            )(input);
        },
        updateEmailOrPassword: async function (input) {
            let user = await __1.getUser(input.recipeUserId.getAsString(), input.userContext);
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            let inputUserIdIsPointingToEmailPasswordUser =
                user.loginMethods.find((lM) => {
                    return (
                        lM.recipeId === "emailpassword" &&
                        lM.recipeUserId.getAsString() === input.recipeUserId.getAsString()
                    );
                }) !== undefined;
            if (!inputUserIdIsPointingToEmailPasswordUser) {
                throw new Error("Cannot update email or password of a user who signed up using third party login.");
            }
            return originalEmailPasswordImplementation.updateEmailOrPassword.bind(
                emailPasswordRecipeImplementation_1.default(this)
            )(input);
        },
    };
}
exports.default = getRecipeInterface;
