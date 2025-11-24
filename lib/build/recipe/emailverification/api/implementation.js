"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIInterface;
const logger_1 = require("../../../logger");
const recipe_1 = __importDefault(require("../recipe"));
const emailVerificationClaim_1 = require("../emailVerificationClaim");
const error_1 = __importDefault(require("../../session/error"));
const utils_1 = require("../utils");
function getAPIInterface() {
    return {
        verifyEmailPOST: async function ({ token, tenantId, session, options, userContext }) {
            const verifyTokenResponse = await options.recipeImplementation.verifyEmailUsingToken({
                token,
                tenantId,
                attemptAccountLinking: true,
                userContext,
            });
            if (verifyTokenResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
                return verifyTokenResponse;
            }
            // status: "OK"
            let newSession = await recipe_1.default
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
        },
        isEmailVerifiedGET: async function ({ userContext, session, options }) {
            // In this API, we will check if the session's recipe user id's email is verified or not.
            const emailInfo = await recipe_1.default
                .getInstanceOrThrowError()
                .getEmailForRecipeUserId(undefined, session.getRecipeUserId(userContext), userContext);
            if (emailInfo.status === "OK") {
                const isVerified = await options.recipeImplementation.isEmailVerified({
                    recipeUserId: session.getRecipeUserId(userContext),
                    email: emailInfo.email,
                    userContext,
                });
                if (isVerified) {
                    // here we do the same things we do for post email verification
                    // cause email verification could happen in a different browser
                    // whilst the first browser is polling this API - in this case,
                    // we want to have the same effect to the session as if the
                    // email was opened on the original browser itself.
                    let newSession = await recipe_1.default
                        .getInstanceOrThrowError()
                        .updateSessionIfRequiredPostEmailVerification({
                            req: options.req,
                            res: options.res,
                            session,
                            recipeUserIdWhoseEmailGotVerified: session.getRecipeUserId(userContext),
                            userContext,
                        });
                    return {
                        status: "OK",
                        isVerified: true,
                        newSession,
                    };
                } else {
                    await session.setClaimValue(emailVerificationClaim_1.EmailVerificationClaim, false, userContext);
                    return {
                        status: "OK",
                        isVerified: false,
                    };
                }
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                // We consider people without email addresses as validated
                return {
                    status: "OK",
                    isVerified: true,
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
        },
        generateEmailVerifyTokenPOST: async function ({ options, userContext, session }) {
            // In this API, we generate the email verification token for session's recipe user ID.
            const tenantId = session.getTenantId();
            const emailInfo = await recipe_1.default
                .getInstanceOrThrowError()
                .getEmailForRecipeUserId(undefined, session.getRecipeUserId(userContext), userContext);
            if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                (0, logger_1.logDebugMessage)(
                    `Email verification email not sent to user ${session
                        .getRecipeUserId(userContext)
                        .getAsString()} because it doesn't have an email address.`
                );
                // this can happen if the user ID was found, but it has no email. In this
                // case, we treat it as a success case.
                let newSession = await recipe_1.default
                    .getInstanceOrThrowError()
                    .updateSessionIfRequiredPostEmailVerification({
                        req: options.req,
                        res: options.res,
                        session,
                        recipeUserIdWhoseEmailGotVerified: session.getRecipeUserId(userContext),
                        userContext,
                    });
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                    newSession,
                };
            } else if (emailInfo.status === "OK") {
                let response = await options.recipeImplementation.createEmailVerificationToken({
                    recipeUserId: session.getRecipeUserId(userContext),
                    email: emailInfo.email,
                    tenantId,
                    userContext,
                });
                // In case the email is already verified, we do the same thing
                // as what happens in the verifyEmailPOST API post email verification (cause maybe the session is outdated).
                if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                    (0, logger_1.logDebugMessage)(
                        `Email verification email not sent to user ${session
                            .getRecipeUserId(userContext)
                            .getAsString()} because it is already verified.`
                    );
                    let newSession = await recipe_1.default
                        .getInstanceOrThrowError()
                        .updateSessionIfRequiredPostEmailVerification({
                            req: options.req,
                            res: options.res,
                            session,
                            recipeUserIdWhoseEmailGotVerified: session.getRecipeUserId(userContext),
                            userContext,
                        });
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                        newSession,
                    };
                }
                if ((await session.getClaimValue(emailVerificationClaim_1.EmailVerificationClaim)) !== false) {
                    // this can happen if the email was unverified in another browser
                    // and this session is still outdated - and the user has not
                    // called the get email verification API yet.
                    await session.fetchAndSetClaim(emailVerificationClaim_1.EmailVerificationClaim, userContext);
                }
                let emailVerifyLink = (0, utils_1.getEmailVerifyLink)({
                    appInfo: options.appInfo,
                    token: response.token,
                    tenantId,
                    request: options.req,
                    userContext,
                });
                (0, logger_1.logDebugMessage)(`Sending email verification email to ${emailInfo}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "EMAIL_VERIFICATION",
                    user: {
                        id: session.getUserId(),
                        recipeUserId: session.getRecipeUserId(userContext),
                        email: emailInfo.email,
                    },
                    emailVerifyLink,
                    tenantId,
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
                (0, logger_1.logDebugMessage)(
                    "generateEmailVerifyTokenPOST: Returning UNAUTHORISED because the user id provided is unknown"
                );
                throw new error_1.default({ type: error_1.default.UNAUTHORISED, message: "Unknown User ID provided" });
            }
        },
    };
}
