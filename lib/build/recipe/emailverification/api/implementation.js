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
const recipe_2 = __importDefault(require("../../accountlinking/recipe"));
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
                let primaryUserIdThatTheAccountWasLinkedTo = yield recipe_2.default
                    .getInstanceOrThrowError()
                    .createPrimaryUserIdOrLinkAccounts({
                        recipeUserId: verifyTokenResponse.user.recipeUserId,
                        isVerified: true,
                        checkAccountsToLinkTableAsWell: true,
                        userContext,
                    });
                // if a session exists in the API, then we can update the session
                // claim related to email verification
                if (session !== undefined) {
                    // Due to linking, we will have to correct the current
                    // session's user ID. There are four cases here:
                    // --> (Case 1) User signed up and did email verification and the new account
                    // became a primary user (user ID no change)
                    // --> (Case 2) User signed up and did email verification and the new account got linked
                    // to another primary user (user ID change)
                    // --> (Case 3) This is post login account linking, in which the account that got verified
                    // got linked to the session's account (user ID of account has changed to the session's user ID)
                    // -->  (Case 4) This is post login account linking, in which the account that got verified
                    // got linked to ANOTHER primary account (user ID of account has changed to a different user ID != session.getUserId, but
                    // we should ignore this since it will result in the user's session changing.)
                    if (session.getRecipeUserId() === verifyTokenResponse.user.recipeUserId) {
                        // this means that the session's login method's account that it was the
                        // one that just got verified and that we are NOT doing post login
                        // account linking. So this is only for (Case 1) and (Case 2)
                        if (session.getUserId() === primaryUserIdThatTheAccountWasLinkedTo) {
                            // if the session's primary user ID is equal to the
                            // primary user ID that the account was linked to, then
                            // this means that the new account became a primary user (Case 1)
                            // We also have the sub cases here that the account that just
                            // got verified was already linked to the session's primary user ID,
                            // but either way, we don't need to change any user ID.
                            // In this case, all we do is to update the emailverification claim
                            try {
                                // TODO: fetchValue should take a recipeId as well now
                                // and EmailVerificationClaim should use that and not the primary user id
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
                            return {
                                status: "OK",
                                user: verifyTokenResponse.user,
                            };
                        } else {
                            // if the session's primary user ID is NOT equal to the
                            // primary user ID that the account that it was linked to, then
                            // this means that the new account got linked to another primary user (Case 2)
                            // In this case, we need to update the session's user ID by creating
                            // a new session
                            let newSession = yield session_1.default.createNewSession(
                                options.req,
                                options.res,
                                primaryUserIdThatTheAccountWasLinkedTo,
                                session.getRecipeUserId(),
                                {},
                                {},
                                userContext
                            );
                            return {
                                status: "OK",
                                user: verifyTokenResponse.user,
                                newSession,
                            };
                        }
                    } else {
                        // this means that the session's login method's account was NOT the
                        // one that just got verified and that we ARE doing post login
                        // account linking. So this is only for (Case 3) and (Case 4)
                        // In both case 3 and case 4, we do not want to change anything in the
                        // current session in terms of user ID or email verification claim (since
                        // both of these refer to the current logged in user and not the newly
                        // linked user's account). Instead, we just want to remove the
                        // account linking claim from the session.
                        // TODO: remove account linking claim
                        return {
                            status: "OK",
                            user: verifyTokenResponse.user,
                        };
                    }
                } else {
                    // the session is updated when the is email verification GET API is called
                    // so we don't do anything in this API.
                    return {
                        status: "OK",
                        user: verifyTokenResponse.user,
                    };
                }
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
                        recipeUserId: userIdForEmailVerification,
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
                            recipeUserId: userId,
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
