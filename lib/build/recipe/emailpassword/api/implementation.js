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
const logger_1 = require("../../../logger");
const session_1 = require("../../session");
function getAPIImplementation() {
    return {
        emailExistsGET: function ({ email, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield options.recipeImplementation.getUserByEmail({ email, userContext });
                return {
                    status: "OK",
                    exists: user !== undefined,
                };
            });
        },
        generatePasswordResetTokenPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let user = yield options.recipeImplementation.getUserByEmail({ email, userContext });
                if (user === undefined) {
                    return {
                        status: "OK",
                    };
                }
                let response = yield options.recipeImplementation.createResetPasswordToken({
                    userId: user.id,
                    userContext,
                });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    logger_1.logDebugMessage(`Password reset email not sent, unknown user id: ${user.id}`);
                    return {
                        status: "OK",
                    };
                }
                let passwordResetLink =
                    (yield options.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user, userContext)) +
                    "?token=" +
                    response.token +
                    "&rid=" +
                    options.recipeId;
                logger_1.logDebugMessage(`Sending password reset email to ${email}`);
                yield options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "PASSWORD_RESET",
                    user,
                    passwordResetLink,
                    userContext,
                });
                return {
                    status: "OK",
                };
            });
        },
        passwordResetPOST: function ({ formFields, token, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let newPassword = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.resetPasswordUsingToken({
                    token,
                    newPassword,
                    userContext,
                });
                return response;
            });
        },
        signInPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.signIn({ email, password, userContext });
                if (response.status === "WRONG_CREDENTIALS_ERROR") {
                    return response;
                }
                let user = response.user;
                let session = yield session_1.default.createNewSession(options.res, user.id, {}, {}, userContext);
                return {
                    status: "OK",
                    session,
                    user,
                };
            });
        },
        signUpPOST: function ({ formFields, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let email = formFields.filter((f) => f.id === "email")[0].value;
                let password = formFields.filter((f) => f.id === "password")[0].value;
                let response = yield options.recipeImplementation.signUp({ email, password, userContext });
                if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                    return response;
                }
                let user = response.user;
                let session = yield session_1.default.createNewSession(options.res, user.id, {}, {}, userContext);
                return {
                    status: "OK",
                    session,
                    user,
                };
            });
        },
    };
}
exports.default = getAPIImplementation;
