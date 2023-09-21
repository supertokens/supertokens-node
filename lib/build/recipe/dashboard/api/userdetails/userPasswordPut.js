"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPasswordPut = void 0;
const error_1 = __importDefault(require("../../../../error"));
const recipe_1 = __importDefault(require("../../../emailpassword/recipe"));
const emailpassword_1 = __importDefault(require("../../../emailpassword"));
const recipe_2 = __importDefault(require("../../../thirdpartyemailpassword/recipe"));
const thirdpartyemailpassword_1 = __importDefault(require("../../../thirdpartyemailpassword"));
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const userPasswordPut = async (_, tenantId, options, userContext) => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;
    const newPassword = requestBody.newPassword;
    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (newPassword === undefined || typeof newPassword !== "string") {
        throw new error_1.default({
            message: "Required parameter 'newPassword' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let recipeToUse;
    try {
        recipe_1.default.getInstanceOrThrowError();
        recipeToUse = "emailpassword";
    } catch (_) {}
    if (recipeToUse === undefined) {
        try {
            recipe_2.default.getInstanceOrThrowError();
            recipeToUse = "thirdpartyemailpassword";
        } catch (_) {}
    }
    if (recipeToUse === undefined) {
        // This means that neither emailpassword or thirdpartyemailpassword is initialised
        throw new Error("Should never come here");
    }
    if (recipeToUse === "emailpassword") {
        const updateResponse = await emailpassword_1.default.updateEmailOrPassword({
            recipeUserId: new recipeUserId_1.default(recipeUserId),
            password: newPassword,
            tenantIdForPasswordPolicy: tenantId,
            userContext,
        });
        if (
            updateResponse.status === "UNKNOWN_USER_ID_ERROR" ||
            updateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR" ||
            updateResponse.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR"
        ) {
            // Techincally it can but its an edge case so we assume that it wont
            throw new Error("Should never come here");
        } else if (updateResponse.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
            return {
                status: "INVALID_PASSWORD_ERROR",
                error: updateResponse.failureReason,
            };
        }
        return {
            status: "OK",
        };
    }
    const updateResponse = await thirdpartyemailpassword_1.default.updateEmailOrPassword({
        recipeUserId: new recipeUserId_1.default(recipeUserId),
        password: newPassword,
        tenantIdForPasswordPolicy: tenantId,
        userContext,
    });
    if (
        updateResponse.status === "UNKNOWN_USER_ID_ERROR" ||
        updateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR" ||
        updateResponse.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR"
    ) {
        // Techincally it can but its an edge case so we assume that it wont
        throw new Error("Should never come here");
    } else if (updateResponse.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
        return {
            status: "INVALID_PASSWORD_ERROR",
            error: updateResponse.failureReason,
        };
    }
    return {
        status: "OK",
    };
};
exports.userPasswordPut = userPasswordPut;
