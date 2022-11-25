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
const error_1 = require("../../../../error");
const recipe_1 = require("../../../emailpassword/recipe");
const recipe_2 = require("../../../thirdpartyemailpassword/recipe");
const recipe_3 = require("../../../passwordless/recipe");
const recipe_4 = require("../../../thirdpartypasswordless/recipe");
const emailpassword_1 = require("../../../emailpassword");
const passwordless_1 = require("../../../passwordless");
const thirdpartyemailpassword_1 = require("../../../thirdpartyemailpassword");
const thirdpartypasswordless_1 = require("../../../thirdpartypasswordless");
const utils_1 = require("../../utils");
const recipe_5 = require("../../../usermetadata/recipe");
const usermetadata_1 = require("../../../usermetadata");
const constants_1 = require("../../../emailpassword/constants");
const utils_2 = require("../../../passwordless/utils");
const updateEmailForRecipeId = (recipeId, userId, email) =>
    __awaiter(void 0, void 0, void 0, function* () {
        if (recipeId === "emailpassword") {
            let emailFormFields = recipe_1.default
                .getInstanceOrThrowError()
                .config.signUpFeature.formFields.filter((field) => field.id === constants_1.FORM_FIELD_EMAIL_ID);
            let validationError = yield emailFormFields[0].validate(email);
            if (validationError !== undefined) {
                return {
                    status: "INVALID_EMAIL_ERROR",
                    error: validationError,
                };
            }
            const emailUpdateResponse = yield emailpassword_1.default.updateEmailOrPassword({
                userId,
                email,
            });
            if (emailUpdateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }
        if (recipeId === "thirdpartyemailpassword") {
            let emailFormFields = recipe_2.default
                .getInstanceOrThrowError()
                .config.signUpFeature.formFields.filter((field) => field.id === constants_1.FORM_FIELD_EMAIL_ID);
            let validationError = yield emailFormFields[0].validate(email);
            if (validationError !== undefined) {
                return {
                    status: "INVALID_EMAIL_ERROR",
                    error: validationError,
                };
            }
            const emailUpdateResponse = yield thirdpartyemailpassword_1.default.updateEmailOrPassword({
                userId,
                email,
            });
            if (emailUpdateResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
            if (emailUpdateResponse.status === "UNKNOWN_USER_ID_ERROR") {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
            };
        }
        if (recipeId === "passwordless") {
            let isValidEmail = true;
            let validationError = "";
            const passwordlessConfig = recipe_3.default.getInstanceOrThrowError().config;
            if (passwordlessConfig.contactMethod === "PHONE") {
                const validationResult = yield utils_2.defaultValidateEmail(email);
                if (validationResult !== undefined) {
                    isValidEmail = false;
                    validationError = validationResult;
                }
            } else {
                const validationResult = yield passwordlessConfig.validateEmailAddress(email);
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
            const updateResult = yield passwordless_1.default.updateUser({
                userId,
                email,
            });
            if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
                throw new Error("Should never come here");
            }
            if (updateResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }
        if (recipeId === "thirdpartypasswordless") {
            let isValidEmail = true;
            let validationError = "";
            const passwordlessConfig = recipe_4.default.getInstanceOrThrowError().passwordlessRecipe.config;
            if (passwordlessConfig.contactMethod === "PHONE") {
                const validationResult = yield utils_2.defaultValidateEmail(email);
                if (validationResult !== undefined) {
                    isValidEmail = false;
                    validationError = validationResult;
                }
            } else {
                const validationResult = yield passwordlessConfig.validateEmailAddress(email);
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
            const updateResult = yield thirdpartypasswordless_1.default.updatePasswordlessUser({
                userId,
                email,
            });
            if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
                throw new Error("Should never come here");
            }
            if (updateResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }
        /**
         * If it comes here then the user is a third party user in which case the UI should not have allowed this
         */
        throw new Error("Should never come here");
    });
const updatePhoneForRecipeId = (recipeId, userId, phone) =>
    __awaiter(void 0, void 0, void 0, function* () {
        if (recipeId === "passwordless") {
            let isValidPhone = true;
            let validationError = "";
            const passwordlessConfig = recipe_3.default.getInstanceOrThrowError().config;
            if (passwordlessConfig.contactMethod === "EMAIL") {
                const validationResult = yield utils_2.defaultValidatePhoneNumber(phone);
                if (validationResult !== undefined) {
                    isValidPhone = false;
                    validationError = validationResult;
                }
            } else {
                const validationResult = yield passwordlessConfig.validatePhoneNumber(phone);
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
            const updateResult = yield passwordless_1.default.updateUser({
                userId,
                phoneNumber: phone,
            });
            if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
                throw new Error("Should never come here");
            }
            if (updateResult.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR") {
                return {
                    status: "PHONE_ALREADY_EXISTS_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }
        if (recipeId === "thirdpartypasswordless") {
            let isValidPhone = true;
            let validationError = "";
            const passwordlessConfig = recipe_4.default.getInstanceOrThrowError().passwordlessRecipe.config;
            if (passwordlessConfig.contactMethod === "EMAIL") {
                const validationResult = yield utils_2.defaultValidatePhoneNumber(phone);
                if (validationResult !== undefined) {
                    isValidPhone = false;
                    validationError = validationResult;
                }
            } else {
                const validationResult = yield passwordlessConfig.validatePhoneNumber(phone);
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
            const updateResult = yield thirdpartypasswordless_1.default.updatePasswordlessUser({
                userId,
                phoneNumber: phone,
            });
            if (updateResult.status === "UNKNOWN_USER_ID_ERROR") {
                throw new Error("Should never come here");
            }
            if (updateResult.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR") {
                return {
                    status: "PHONE_ALREADY_EXISTS_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }
        /**
         * If it comes here then the user is a not a passwordless user in which case the UI should not have allowed this
         */
        throw new Error("Should never come here");
    });
exports.userPut = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const userId = requestBody.userId;
        const recipeId = requestBody.recipeId;
        const firstName = requestBody.firstName;
        const lastName = requestBody.lastName;
        const email = requestBody.email;
        const phone = requestBody.phone;
        if (userId === undefined || typeof userId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'userId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (recipeId === undefined || typeof recipeId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'recipeId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (!utils_1.isValidRecipeId(recipeId)) {
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
        let userResponse = yield utils_1.getUserForRecipeId(userId, recipeId);
        if (userResponse.user === undefined || userResponse.recipe === undefined) {
            throw new Error("Should never come here");
        }
        if (firstName.trim() !== "" || lastName.trim() !== "") {
            let isRecipeInitialised = false;
            try {
                recipe_5.default.getInstanceOrThrowError();
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
                yield usermetadata_1.default.updateUserMetadata(userId, metaDataUpdate);
            }
        }
        if (email.trim() !== "") {
            const emailUpdateResponse = yield updateEmailForRecipeId(userResponse.recipe, userId, email.trim());
            if (emailUpdateResponse.status !== "OK") {
                return emailUpdateResponse;
            }
        }
        if (phone.trim() !== "") {
            const phoneUpdateResponse = yield updatePhoneForRecipeId(userResponse.recipe, userId, phone.trim());
            if (phoneUpdateResponse.status !== "OK") {
                return phoneUpdateResponse;
            }
        }
        return {
            status: "OK",
        };
    });
