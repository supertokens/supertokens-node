"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPut = void 0;
const error_1 = __importDefault(require("../../../../error"));
const recipe_1 = __importDefault(require("../../../emailpassword/recipe"));
const recipe_2 = __importDefault(require("../../../passwordless/recipe"));
const recipe_3 = __importDefault(require("../../../webauthn/recipe"));
const emailpassword_1 = __importDefault(require("../../../emailpassword"));
const passwordless_1 = __importDefault(require("../../../passwordless"));
const webauthn_1 = __importDefault(require("../../../webauthn"));
const utils_1 = require("../../utils");
const recipe_4 = __importDefault(require("../../../usermetadata/recipe"));
const usermetadata_1 = __importDefault(require("../../../usermetadata"));
const constants_1 = require("../../../emailpassword/constants");
const utils_2 = require("../../../passwordless/utils");
const recipeUserId_1 = __importDefault(require("../../../../recipeUserId"));
const updateEmailForRecipeId = async (recipeId, recipeUserId, email, tenantId, userContext) => {
    if (recipeId === "emailpassword") {
        let emailFormFields = recipe_1.default
            .getInstanceOrThrowError()
            .config.signUpFeature.formFields.filter((field) => field.id === constants_1.FORM_FIELD_EMAIL_ID);
        let validationError = await emailFormFields[0].validate(email, tenantId, userContext);
        if (validationError !== undefined) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }
        const emailUpdateResponse = await emailpassword_1.default.updateEmailOrPassword({
            recipeUserId,
            email,
            userContext,
        });
        if (emailUpdateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        } else if (emailUpdateResponse.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
            return {
                status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                reason: emailUpdateResponse.reason,
            };
        } else if (emailUpdateResponse.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }
        return {
            status: "OK",
        };
    }
    if (recipeId === "passwordless") {
        let isValidEmail = true;
        let validationError = "";
        const passwordlessConfig = recipe_2.default.getInstanceOrThrowError().config;
        if (passwordlessConfig.contactMethod === "PHONE") {
            const validationResult = await (0, utils_2.defaultValidateEmail)(email);
            if (validationResult !== undefined) {
                isValidEmail = false;
                validationError = validationResult;
            }
        } else {
            const validationResult = await passwordlessConfig.validateEmailAddress(email, tenantId);
            if (validationResult !== undefined) {
                isValidEmail = false;
                validationError = validationResult;
            }
        }
        if (!isValidEmail) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }
        const updateResult = await passwordless_1.default.updateUser({
            recipeUserId,
            email,
            userContext,
        });
        if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }
        if (updateResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        }
        if (
            updateResult.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR" ||
            updateResult.status === "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR"
        ) {
            return {
                status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                reason: updateResult.reason,
            };
        }
        return {
            status: "OK",
        };
    }
    if (recipeId === "webauthn") {
        let validationError = await recipe_3.default
            .getInstanceOrThrowError()
            .config.validateEmailAddress(email, tenantId, userContext);
        if (validationError !== undefined) {
            return {
                status: "INVALID_EMAIL_ERROR",
                error: validationError,
            };
        }
        const emailUpdateResponse = await webauthn_1.default.updateUserEmail({
            email,
            recipeUserId: recipeUserId.getAsString(),
            tenantId,
            userContext,
        });
        if (emailUpdateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
            return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
            };
        } else if (emailUpdateResponse.status === "UNKNOWN_USER_ID_ERROR") {
            throw new Error("Should never come here");
        }
        return {
            status: "OK",
        };
    }
    /**
     * If it comes here then the user is a third party user in which case the UI should not have allowed this
     */
    throw new Error("Should never come here");
};
const updatePhoneForRecipeId = async (recipeUserId, phone, tenantId, userContext) => {
    let isValidPhone = true;
    let validationError = "";
    const passwordlessConfig = recipe_2.default.getInstanceOrThrowError().config;
    if (passwordlessConfig.contactMethod === "EMAIL") {
        const validationResult = await (0, utils_2.defaultValidatePhoneNumber)(phone);
        if (validationResult !== undefined) {
            isValidPhone = false;
            validationError = validationResult;
        }
    } else {
        const validationResult = await passwordlessConfig.validatePhoneNumber(phone, tenantId);
        if (validationResult !== undefined) {
            isValidPhone = false;
            validationError = validationResult;
        }
    }
    if (!isValidPhone) {
        return {
            status: "INVALID_PHONE_ERROR",
            error: validationError,
        };
    }
    const updateResult = await passwordless_1.default.updateUser({
        recipeUserId,
        phoneNumber: phone,
        userContext,
    });
    if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
        throw new Error("Should never come here");
    }
    if (updateResult.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR") {
        return {
            status: "PHONE_ALREADY_EXISTS_ERROR",
        };
    }
    if (updateResult.status === "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR") {
        return {
            status: updateResult.status,
            reason: updateResult.reason,
        };
    }
    return {
        status: "OK",
    };
};
const userPut = async (_, tenantId, options, userContext) => {
    const requestBody = await options.req.getJSONBody();
    const recipeUserId = requestBody.recipeUserId;
    const recipeId = requestBody.recipeId;
    const firstName = requestBody.firstName;
    const lastName = requestBody.lastName;
    const email = requestBody.email;
    const phone = requestBody.phone;
    if (recipeUserId === undefined || typeof recipeUserId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'recipeUserId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (recipeId === undefined || typeof recipeId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'recipeId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (!(0, utils_1.isValidRecipeId)(recipeId)) {
        throw new error_1.default({
            message: "Invalid recipe id",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (firstName === undefined || typeof firstName !== "string") {
        throw new error_1.default({
            message: "Required parameter 'firstName' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (lastName === undefined || typeof lastName !== "string") {
        throw new error_1.default({
            message: "Required parameter 'lastName' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (email === undefined || typeof email !== "string") {
        throw new error_1.default({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (phone === undefined || typeof phone !== "string") {
        throw new error_1.default({
            message: "Required parameter 'phone' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let userResponse = await (0, utils_1.getUserForRecipeId)(
        new recipeUserId_1.default(recipeUserId),
        recipeId,
        userContext
    );
    if (userResponse.user === undefined || userResponse.recipe === undefined) {
        throw new Error("Should never come here");
    }
    if (firstName.trim() !== "" || lastName.trim() !== "") {
        let isRecipeInitialised = false;
        try {
            recipe_4.default.getInstanceOrThrowError();
            isRecipeInitialised = true;
        } catch (_) {
            // no op
        }
        if (isRecipeInitialised) {
            let metaDataUpdate = {};
            if (firstName.trim() !== "") {
                metaDataUpdate["first_name"] = firstName.trim();
            }
            if (lastName.trim() !== "") {
                metaDataUpdate["last_name"] = lastName.trim();
            }
            await usermetadata_1.default.updateUserMetadata(userResponse.user.id, metaDataUpdate, userContext);
        }
    }
    if (email.trim() !== "") {
        const emailUpdateResponse = await updateEmailForRecipeId(
            userResponse.recipe,
            new recipeUserId_1.default(recipeUserId),
            email.trim(),
            tenantId,
            userContext
        );
        if (emailUpdateResponse.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
            return {
                error: emailUpdateResponse.reason,
                status: emailUpdateResponse.status,
            };
        }
        if (emailUpdateResponse.status !== "OK") {
            return emailUpdateResponse;
        }
    }
    if (phone.trim() !== "") {
        const phoneUpdateResponse = await updatePhoneForRecipeId(
            new recipeUserId_1.default(recipeUserId),
            phone.trim(),
            tenantId,
            userContext
        );
        if (phoneUpdateResponse.status === "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR") {
            return {
                error: phoneUpdateResponse.reason,
                status: phoneUpdateResponse.status,
            };
        }
        if (phoneUpdateResponse.status !== "OK") {
            return phoneUpdateResponse;
        }
    }
    return {
        status: "OK",
    };
};
exports.userPut = userPut;
