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
const emailpassword_1 = require("../../../emailpassword");
const recipe_2 = require("../../../thirdpartyemailpassword/recipe");
const thirdpartyemailpassword_1 = require("../../../thirdpartyemailpassword");
const constants_1 = require("../../../emailpassword/constants");
exports.userPasswordPut = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const userId = requestBody.userId;
        const newPassword = requestBody.newPassword;
        if (userId === undefined || typeof userId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'userId' is missing or has an invalid type",
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
            let passwordFormFields = recipe_1.default
                .getInstanceOrThrowError()
                .config.signUpFeature.formFields.filter((field) => field.id === constants_1.FORM_FIELD_PASSWORD_ID);
            let passwordValidationError = yield passwordFormFields[0].validate(newPassword);
            if (passwordValidationError !== undefined) {
                return {
                    status: "INVALID_PASSWORD_ERROR",
                    error: passwordValidationError,
                };
            }
            const passwordResetToken = yield emailpassword_1.default.createResetPasswordToken(userId);
            if (passwordResetToken.status === "UNKNOWN_USER_ID_ERROR") {
                // Techincally it can but its an edge case so we assume that it wont
                throw new Error("Should never come here");
            }
            const passwordResetResponse = yield emailpassword_1.default.resetPasswordUsingToken(
                passwordResetToken.token,
                newPassword
            );
            if (passwordResetResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
            };
        }
        let passwordFormFields = recipe_2.default
            .getInstanceOrThrowError()
            .config.signUpFeature.formFields.filter((field) => field.id === constants_1.FORM_FIELD_PASSWORD_ID);
        let passwordValidationError = yield passwordFormFields[0].validate(newPassword);
        if (passwordValidationError !== undefined) {
            return {
                status: "INVALID_PASSWORD_ERROR",
                error: passwordValidationError,
            };
        }
        const passwordResetToken = yield thirdpartyemailpassword_1.default.createResetPasswordToken(userId);
        if (passwordResetToken.status === "UNKNOWN_USER_ID_ERROR") {
            // Techincally it can but its an edge case so we assume that it wont
            throw new Error("Should never come here");
        }
        const passwordResetResponse = yield thirdpartyemailpassword_1.default.resetPasswordUsingToken(
            passwordResetToken.token,
            newPassword
        );
        if (passwordResetResponse.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
            throw new Error("Should never come here");
        }
        return {
            status: "OK",
        };
    });
