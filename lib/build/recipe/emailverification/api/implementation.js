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
const recipe_1 = require("../recipe");
const emailVerificationClaim_1 = require("../emailVerificationClaim");
function getAPIInterface() {
    return {
        verifyEmailPOST: function ({ token, options, session, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const res = yield options.recipeImplementation.verifyEmailUsingToken({ token, userContext });
                if (res.status === "OK" && session !== undefined) {
                    yield session.fetchAndSetClaim(emailVerificationClaim_1.EmailVerificationClaim);
                }
                return res;
            });
        },
        isEmailVerifiedGET: function ({ userContext, session }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                yield session.fetchAndSetClaim(emailVerificationClaim_1.EmailVerificationClaim, userContext);
                const isVerified = yield session.getClaimValue(
                    emailVerificationClaim_1.EmailVerificationClaim,
                    userContext
                );
                if (isVerified === undefined) {
                    throw new Error("Should never come here: EmailVerificationClaim failed to set value");
                }
                return {
                    status: "OK",
                    isVerified,
                };
            });
        },
        generateEmailVerifyTokenPOST: function ({ options, userContext, session }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                const userId = session.getUserId();
                const emailInfo = yield recipe_1.default
                    .getInstanceOrThrowError()
                    .getEmailForUserId(userId, userContext);
                if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    logger_1.logDebugMessage(
                        `Email verification email not sent to user ${userId} because it doesn't have an email address.`
                    );
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                    };
                } else if (emailInfo.status === "OK") {
                    let response = yield options.recipeImplementation.createEmailVerificationToken({
                        userId,
                        email: emailInfo.email,
                        userContext,
                    });
                    if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                        logger_1.logDebugMessage(
                            `Email verification email not sent to ${emailInfo.email} because it is already verified.`
                        );
                        return response;
                    }
                    let emailVerifyLink =
                        options.appInfo.websiteDomain.getAsStringDangerous() +
                        options.appInfo.websiteBasePath.getAsStringDangerous() +
                        "/verify-email" +
                        "?token=" +
                        response.token +
                        "&rid=" +
                        options.recipeId;
                    logger_1.logDebugMessage(`Sending email verification email to ${emailInfo}`);
                    yield options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                        type: "EMAIL_VERIFICATION",
                        user: {
                            id: userId,
                            email: emailInfo.email,
                        },
                        emailVerifyLink,
                        userContext,
                    });
                    return {
                        status: "OK",
                    };
                } else {
                    throw new Error("Should never come here: UNKNOWN_USER_ID or invalid result from getEmailForUserId");
                }
            });
        },
    };
}
exports.default = getAPIInterface;
