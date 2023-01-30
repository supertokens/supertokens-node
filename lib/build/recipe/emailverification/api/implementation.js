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
const error_1 = require("../../session/error");
const utils_1 = require("../utils");
const __1 = require("../../..");
const session_1 = require("../../session");
const accountlinking_1 = require("../../accountlinking");
function getAPIInterface() {
    return {
        verifyEmailPOST: function ({ token, options, session, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const res = yield options.recipeImplementation.verifyEmailUsingToken({ token, userContext });
                if (res.status === "OK") {
                    yield accountlinking_1.default.createPrimaryUserIdOrLinkAccounts(
                        res.user.recipeUserId,
                        session,
                        userContext
                    );
                    if (session !== undefined) {
                        try {
                            yield session.fetchAndSetClaim(
                                emailVerificationClaim_1.EmailVerificationClaim,
                                userContext
                            );
                        } catch (err) {
                            // This should never happen, since we've just set the status above.
                            if (err.message === "UNKNOWN_USER_ID") {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Unknown User ID provided",
                                });
                            }
                            throw err;
                        }
                    }
                    // checking if a new primaryUserId has been associated with recipeUserId
                    // if user.id equals to user.recipeUserId, there are chances that
                    // a primaryUserId, different from user.id got associated with the
                    // recipe user. So we use getUser function
                    if (res.user.id === res.user.recipeUserId) {
                        let user = yield __1.getUser(res.user.recipeUserId);
                        if (user === undefined) {
                            throw Error(
                                `this error should never be thrown. user not found after verification: ${res.user.recipeUserId}`
                            );
                        }
                        return {
                            status: "OK",
                            user: Object.assign(Object.assign({}, res.user), { id: user.id }),
                        };
                    }
                }
                return res;
            });
        },
        isEmailVerifiedGET: function ({ userContext, session }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                try {
                    yield session.fetchAndSetClaim(emailVerificationClaim_1.EmailVerificationClaim, userContext);
                } catch (err) {
                    if (err.message === "UNKNOWN_USER_ID") {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Unknown User ID provided",
                        });
                    }
                    throw err;
                }
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
                const recipeUserId = session.getRecipeUserId();
                let user = yield __1.getUser(recipeUserId, userContext);
                if (user === undefined) {
                    throw Error(`this error should not be thrown. session recipe user not found: ${userId}`);
                }
                if (user.isPrimaryUser) {
                    if (user.id !== userId) {
                        session = yield session_1.default.createNewSession(
                            options.res,
                            user.id,
                            recipeUserId,
                            session.getAccessTokenPayload(),
                            yield session.getSessionData()
                        );
                    }
                }
                // TODO: session claim exists for account linking
                let recipeUserIdFromSessionClaim = recipeUserId;
                let recipeUser = user.loginMethods.find((u) => u.recipeUserId === recipeUserId);
                if (recipeUser === undefined) {
                    throw Error(`this error should not be thrown. recipe user not found: ${userId}`);
                }
                let isRecipeUserAccountVerified = recipeUser.verified;
                let userIdForEmailVerification;
                if (recipeUserIdFromSessionClaim === recipeUserId || !isRecipeUserAccountVerified) {
                    userIdForEmailVerification = recipeUserId;
                } else {
                    userIdForEmailVerification = recipeUserIdFromSessionClaim;
                }
                const emailInfo = yield recipe_1.default
                    .getInstanceOrThrowError()
                    .getEmailForUserId(userIdForEmailVerification, userContext);
                if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    logger_1.logDebugMessage(
                        `Email verification email not sent to user ${userId} because it doesn't have an email address.`
                    );
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                    };
                } else if (emailInfo.status === "OK") {
                    let response = yield options.recipeImplementation.createEmailVerificationToken({
                        userId: userIdForEmailVerification,
                        email: emailInfo.email,
                        userContext,
                    });
                    if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                        if ((yield session.getClaimValue(emailVerificationClaim_1.EmailVerificationClaim)) !== true) {
                            // this can happen if the email was verified in another browser
                            // and this session is still outdated - and the user has not
                            // called the get email verification API yet.
                            yield session.fetchAndSetClaim(
                                emailVerificationClaim_1.EmailVerificationClaim,
                                userContext
                            );
                        }
                        logger_1.logDebugMessage(
                            `Email verification email not sent to ${emailInfo.email} because it is already verified.`
                        );
                        return response;
                    }
                    if ((yield session.getClaimValue(emailVerificationClaim_1.EmailVerificationClaim)) !== false) {
                        // this can happen if the email was unverified in another browser
                        // and this session is still outdated - and the user has not
                        // called the get email verification API yet.
                        yield session.fetchAndSetClaim(emailVerificationClaim_1.EmailVerificationClaim, userContext);
                    }
                    let emailVerifyLink = utils_1.getEmailVerifyLink({
                        appInfo: options.appInfo,
                        token: response.token,
                        recipeId: options.recipeId,
                    });
                    logger_1.logDebugMessage(`Sending email verification email to ${emailInfo}`);
                    yield options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                        type: "EMAIL_VERIFICATION",
                        user: {
                            id: userId,
                            recipeUserId: userIdForEmailVerification,
                            email: emailInfo.email,
                        },
                        emailVerifyLink,
                        userContext,
                    });
                    return {
                        status: "OK",
                    };
                } else {
                    throw new error_1.default({
                        type: error_1.default.UNAUTHORISED,
                        message: "Unknown User ID provided",
                    });
                }
            });
        },
    };
}
exports.default = getAPIInterface;
