import { APIInterface, User } from "../";
import { logDebugMessage } from "../../../logger";
import EmailVerificationRecipe from "../recipe";
import { GeneralErrorResponse } from "../../../types";
import { EmailVerificationClaim } from "../emailVerificationClaim";
import SessionError from "../../session/error";
import { getEmailVerifyLink } from "../utils";
import { SessionContainerInterface } from "../../session/types";

export default function getAPIInterface(): APIInterface {
    return {
        verifyEmailPOST: async function (
            this: APIInterface,
            { token, options, session, userContext }
        ): Promise<
            | { status: "OK"; user: User; newSession?: SessionContainerInterface }
            | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }
            | GeneralErrorResponse
        > {
            const verifyTokenResponse = await options.recipeImplementation.verifyEmailUsingToken({
                token,
                userContext,
            });

            if (verifyTokenResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
                return verifyTokenResponse;
            }

            // status: "OK"
            let newSession = await EmailVerificationRecipe.getInstanceOrThrowError().updateSessionIfRequiredPostEmailVerification(
                {
                    req: options.req,
                    res: options.res,
                    session,
                    recipeUserIdWhoseEmailGotVerified: verifyTokenResponse.user.recipeUserId,
                    userContext,
                }
            );

            return {
                status: "OK",
                user: verifyTokenResponse.user,
                newSession,
            };
        },

        isEmailVerifiedGET: async function (
            this: APIInterface,
            { userContext, session, options }
        ): Promise<
            | {
                  status: "OK";
                  isVerified: boolean;
                  newSession?: SessionContainerInterface;
              }
            | GeneralErrorResponse
        > {
            // In this API, we will check if the session's recipe user id's email is verified or not.

            const emailInfo = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForRecipeUserId(
                session.getRecipeUserId(),
                userContext
            );

            if (emailInfo.status === "OK") {
                const isVerified = await options.recipeImplementation.isEmailVerified({
                    recipeUserId: session.getRecipeUserId(),
                    email: emailInfo.email,
                    userContext,
                });

                if (isVerified) {
                    // here we do the same things we do for post email verification
                    // cause email verification could happen in a different browser
                    // whilst the first browser is polling this API - in this case,
                    // we want to have the same effect to the session as if the
                    // email was opened on the original browser itself.
                    let newSession = await EmailVerificationRecipe.getInstanceOrThrowError().updateSessionIfRequiredPostEmailVerification(
                        {
                            req: options.req,
                            res: options.res,
                            session,
                            recipeUserIdWhoseEmailGotVerified: session.getRecipeUserId(),
                            userContext,
                        }
                    );
                    return {
                        status: "OK",
                        isVerified: true,
                        newSession,
                    };
                } else {
                    if ((await session.getClaimValue(EmailVerificationClaim)) !== false) {
                        await session.setClaimValue(EmailVerificationClaim, false, userContext);
                    }

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
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Unknown User ID provided",
                });
            }
        },

        generateEmailVerifyTokenPOST: async function (
            this: APIInterface,
            { options, userContext, session }
        ): Promise<
            | { status: "OK" }
            | { status: "EMAIL_ALREADY_VERIFIED_ERROR"; newSession?: SessionContainerInterface }
            | GeneralErrorResponse
        > {
            // In this API, we generate the email verification token for session's recipe user ID.

            // In case the email is already verified, we do the same thing
            // as what happens in the verifyEmailPOST API post email verification (cause maybe the session is outdated).

            const emailInfo = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForRecipeUserId(
                session.getRecipeUserId(),
                userContext
            );

            if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                logDebugMessage(
                    `Email verification email not sent to user ${session
                        .getRecipeUserId()
                        .getAsString()} because it doesn't have an email address.`
                );
                // this can happen if the user ID was found, but it has no email. In this
                // case, we treat it as a success case.
                let newSession = await EmailVerificationRecipe.getInstanceOrThrowError().updateSessionIfRequiredPostEmailVerification(
                    {
                        req: options.req,
                        res: options.res,
                        session,
                        recipeUserIdWhoseEmailGotVerified: session.getRecipeUserId(),
                        userContext,
                    }
                );
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                    newSession,
                };
            } else if (emailInfo.status === "OK") {
                let response = await options.recipeImplementation.createEmailVerificationToken({
                    recipeUserId: session.getRecipeUserId(),
                    email: emailInfo.email,
                    userContext,
                });

                if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                    logDebugMessage(
                        `Email verification email not sent to user ${session
                            .getRecipeUserId()
                            .getAsString()} because it is already verified.`
                    );
                    let newSession = await EmailVerificationRecipe.getInstanceOrThrowError().updateSessionIfRequiredPostEmailVerification(
                        {
                            req: options.req,
                            res: options.res,
                            session,
                            recipeUserIdWhoseEmailGotVerified: session.getRecipeUserId(),
                            userContext,
                        }
                    );
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                        newSession,
                    };
                }

                if ((await session.getClaimValue(EmailVerificationClaim)) !== false) {
                    // this can happen if the email was unverified in another browser
                    // and this session is still outdated - and the user has not
                    // called the get email verification API yet.
                    await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
                }

                let emailVerifyLink = getEmailVerifyLink({
                    appInfo: options.appInfo,
                    token: response.token,
                    recipeId: options.recipeId,
                });

                logDebugMessage(`Sending email verification email to ${emailInfo}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "EMAIL_VERIFICATION",
                    user: {
                        id: session.getUserId(),
                        recipeUserId: session.getRecipeUserId(),
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
                logDebugMessage(
                    "generateEmailVerifyTokenPOST: Returning UNAUTHORISED because the user id provided is unknown"
                );
                throw new SessionError({ type: SessionError.UNAUTHORISED, message: "Unknown User ID provided" });
            }
        },
    };
}
