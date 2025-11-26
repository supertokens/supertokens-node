"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailVerifyGet = void 0;
const error_1 = __importDefault(require("../../../../error"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const userEmailVerifyGet = async ({ stInstance, options, userContext }) => {
    const req = options.req;
    const recipeUserId = req.getKeyValueFromQuery("recipeUserId");
    if (recipeUserId === undefined) {
        throw new error_1.default({
            message: "Missing required parameter 'recipeUserId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let emailVerificationRecipe = undefined;
    try {
        emailVerificationRecipe = stInstance.getRecipeInstanceOrThrow("emailverification");
    } catch (e) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    let email = undefined;
    const emailInfo = await emailVerificationRecipe.getEmailForRecipeUserId(
        undefined,
        new recipeUserId_1.default(recipeUserId),
        userContext
    );
    if (emailInfo.status === "OK") {
        email = emailInfo.email;
    } else {
        throw new error_1.default({
            message: "Failed to get email for recipe user id",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
        recipeUserId: new recipeUserId_1.default(recipeUserId),
        email,
        userContext,
    });
    return {
        status: "OK",
        isVerified: response,
    };
};
exports.userEmailVerifyGet = userEmailVerifyGet;
