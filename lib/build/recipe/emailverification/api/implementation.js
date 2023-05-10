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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const recipe_1 = __importDefault(require("../recipe"));
const emailVerificationClaim_1 = require("../emailVerificationClaim");
const error_1 = __importDefault(require("../../session/error"));
const utils_1 = require("../utils");
const __1 = require("../../..");
const session_1 = __importDefault(require("../../session"));
const accountLinkingClaim_1 = require("../../accountlinking/accountLinkingClaim");
function getAPIInterface() {
    return {
        verifyEmailPOST: function ({ token, options, session, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const verifyTokenResponse = yield options.recipeImplementation.verifyEmailUsingToken({
                    token,
                    userContext,
                });
                if (verifyTokenResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
                    return verifyTokenResponse;
                }
                let newSession = yield recipe_1.default
                    .getInstanceOrThrowError()
                    .updateSessionIfRequiredPostEmailVerification({
                        req: options.req,
                        res: options.res,
                        session,
                        recipeUserIdWhoseEmailGotVerified: verifyTokenResponse.user.recipeUserId,
                        userContext,
                    });
                return {
                    status: "OK",
                    user: verifyTokenResponse.user,
                    newSession,
                };
            });
        },
        isEmailVerifiedGET: function ({ userContext, session, options }) {
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
                            yield session.getSessionDataFromDatabase()
                        );
                    }
                }
                let recipeUserIdFromSessionClaim = yield session.getClaimValue(
                    accountLinkingClaim_1.AccountLinkingClaim,
                    userContext
                );
                if (recipeUserIdFromSessionClaim === undefined) {
                    recipeUserIdFromSessionClaim = recipeUserId;
                }
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
                let isVerified;
                if (userIdForEmailVerification === recipeUserId) {
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
                    isVerified = yield session.getClaimValue(
                        emailVerificationClaim_1.EmailVerificationClaim,
                        userContext
                    );
                } else {
                    const recipe = recipe_1.default.getInstanceOrThrowError();
                    let emailInfo = yield recipe.getEmailForUserId(recipeUserId, userContext);
                    if (emailInfo.status === "OK") {
                        isVerified = yield recipe.recipeInterfaceImpl.isEmailVerified({
                            recipeUserId,
                            email: emailInfo.email,
                            userContext,
                        });
                    } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                        // We consider people without email addresses as validated
                        isVerified = true;
                    } else {
                        throw new Error("UNKNOWN_USER_ID");
                    }
                }
                if (isVerified === undefined) {
                    throw new Error("Should never come here: EmailVerificationClaim failed to set value");
                }
                return {
                    status: "OK",
                    isVerified,
                    session,
                };
            });
        },
        generateEmailVerifyTokenPOST: function ({ options, userContext, session }) {
            return __awaiter(this, void 0, void 0, function* () {
                // In this API, we generate the email verification token for session's recipe user ID.
                // The exception is that if the account linking claim exists in the session,
                // then we will generate the token for that cause that claim implies that we
                // are trying to link that recipe ID to the current session's primary user ID.
                // Either way, in case the email is already verified, we do the same thing
                // as what happens in the verifyEmailPOST API post email verification (cause maybe the session is outdated).
                let recipeUserIdForWhomToGenerateToken = session.getRecipeUserId();
                const fromAccountLinkingClaim = yield session.getClaimValue(
                    accountLinkingClaim_1.AccountLinkingClaim,
                    userContext
                );
                if (fromAccountLinkingClaim !== undefined) {
                    // this means that the claim exists and so we will generate the token for that user id
                    recipeUserIdForWhomToGenerateToken = fromAccountLinkingClaim;
                    // there is a possibility that this user ID is not a recipe user ID anymore
                    // (cause of some race condition), but that shouldn't matter much anyway.
                }
                const emailInfo = yield recipe_1.default
                    .getInstanceOrThrowError()
                    .getEmailForUserId(recipeUserIdForWhomToGenerateToken, userContext);
                if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    logger_1.logDebugMessage(
                        `Email verification email not sent to user ${recipeUserIdForWhomToGenerateToken} because it doesn't have an email address.`
                    );
                    // this can happen if the user ID was found, but it has no email. In this
                    // case, we treat it as a success case.
                    let newSession = yield recipe_1.default
                        .getInstanceOrThrowError()
                        .updateSessionIfRequiredPostEmailVerification({
                            req: options.req,
                            res: options.res,
                            session,
                            recipeUserIdWhoseEmailGotVerified: recipeUserIdForWhomToGenerateToken,
                            userContext,
                        });
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                        newSession,
                    };
                } else if (emailInfo.status === "OK") {
                    let response = yield options.recipeImplementation.createEmailVerificationToken({
                        recipeUserId: recipeUserIdForWhomToGenerateToken,
                        email: emailInfo.email,
                        userContext,
                    });
                    if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                        let newSession = yield recipe_1.default
                            .getInstanceOrThrowError()
                            .updateSessionIfRequiredPostEmailVerification({
                                req: options.req,
                                res: options.res,
                                session,
                                recipeUserIdWhoseEmailGotVerified: recipeUserIdForWhomToGenerateToken,
                                userContext,
                            });
                        return {
                            status: "EMAIL_ALREADY_VERIFIED_ERROR",
                            newSession,
                        };
                    }
                    if (recipeUserIdForWhomToGenerateToken === session.getRecipeUserId()) {
                        // we have the above ID cause we only want to do the below if the
                        // account linking claim is not present. This is cause the email
                        // verification claim is only specific to the current session's user ID.
                        if ((yield session.getClaimValue(emailVerificationClaim_1.EmailVerificationClaim)) !== false) {
                            // this can happen if the email was unverified in another browser
                            // and this session is still outdated - and the user has not
                            // called the get email verification API yet.
                            yield session.fetchAndSetClaim(
                                emailVerificationClaim_1.EmailVerificationClaim,
                                userContext
                            );
                        }
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
                            recipeUserId: recipeUserIdForWhomToGenerateToken,
                            email: emailInfo.email,
                        },
                        emailVerifyLink,
                        userContext,
                    });
                    return {
                        status: "OK",
                    };
                } else {
                    // this means that the user ID is not known to supertokens. This could
                    // happen if the current session's user ID is not an auth user,
                    // or if it belong to a recipe user ID that got deleted. Either way,
                    // we logout the user.
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
