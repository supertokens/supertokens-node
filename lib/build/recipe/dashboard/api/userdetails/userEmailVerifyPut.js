"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailVerifyPut = void 0;
const error_1 = __importDefault(require("../../../../error"));
const emailverification_1 = __importDefault(require("../../../emailverification"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const userEmailVerifyPut = async ({ stInstance, tenantId, options, userContext }) => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;
    const verified = requestBody.verified;
    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (verified === undefined || typeof verified !== "boolean") {
        throw new error_1.default({
            message: "Required parameter 'verified' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let emailVerificationRecipe = undefined;
    try {
        emailVerificationRecipe = stInstance.getRecipeInstanceOrThrow("emailverification");
    } catch (e) {
        throw new error_1.default({
            message: "Email verification recipe not initialised",
            type: error_1.default.BAD_INPUT_ERROR,
        });
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
    if (verified) {
        const tokenResponse = await emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken({
            recipeUserId: new recipeUserId_1.default(recipeUserId),
            email: email,
            tenantId,
            userContext,
        });
        if (tokenResponse.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "OK",
            };
        }
        const verifyResponse = await emailverification_1.default.verifyEmailUsingToken(
            tenantId,
            tokenResponse.token,
            undefined,
            userContext
        );
        if (verifyResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
            // This should never happen because we consume the token immediately after creating it
            throw new Error("Should not come here");
        }
    } else {
        await emailverification_1.default.unverifyEmail(
            new recipeUserId_1.default(recipeUserId),
            undefined,
            userContext
        );
    }
    return {
        status: "OK",
    };
};
exports.userEmailVerifyPut = userEmailVerifyPut;
