import { APIInterface, User } from "../";
import { logDebugMessage } from "../../../logger";
import EmailVerificationRecipe from "../recipe";
import { GeneralErrorResponse } from "../../../types";
import { EmailVerificationClaim } from "../emailVerificationClaim";
import SessionError from "../../session/error";
import { getEmailVerifyLink } from "../utils";

export default function getAPIInterface(): APIInterface {
    return {
        verifyEmailPOST: async function ({
            token,
            tenantId,
            options,
            session,
            userContext,
        }): Promise<
            { status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" } | GeneralErrorResponse
        > {
            const res = await options.recipeImplementation.verifyEmailUsingToken({ tenantId, token, userContext });

            if (res.status === "OK" && session !== undefined) {
                try {
                    await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
                } catch (err) {
                    // This should never happen, since we've just set the status above.
                    if ((err as Error).message === "UNKNOWN_USER_ID") {
                        logDebugMessage(
                            "verifyEmailPOST: Returning UNAUTHORISED because the user id provided is unknown"
                        );
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Unknown User ID provided",
                        });
                    }
                    throw err;
                }
            }
            return res;
        },

        isEmailVerifiedGET: async function ({
            userContext,
            session,
        }): Promise<
            | {
                  status: "OK";
                  isVerified: boolean;
              }
            | GeneralErrorResponse
        > {
            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            try {
                await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
            } catch (err) {
                if ((err as Error).message === "UNKNOWN_USER_ID") {
                    logDebugMessage(
                        "isEmailVerifiedGET: Returning UNAUTHORISED because the user id provided is unknown"
                    );
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Unknown User ID provided",
                    });
                }
                throw err;
            }
            const isVerified = await session.getClaimValue(EmailVerificationClaim, userContext);

            if (isVerified === undefined) {
                throw new Error("Should never come here: EmailVerificationClaim failed to set value");
            }

            return {
                status: "OK",
                isVerified,
            };
        },

        generateEmailVerifyTokenPOST: async function ({
            options,
            userContext,
            session,
        }): Promise<{ status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR" } | GeneralErrorResponse> {
            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            const userId = session.getUserId();
            const tenantId = session.getAccessTokenPayload().tId; // TODO use `getTenantId` once implemented

            const emailInfo = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForUserId(
                userId,
                userContext
            );

            if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                logDebugMessage(
                    `Email verification email not sent to user ${userId} because it doesn't have an email address.`
                );
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                };
            } else if (emailInfo.status === "OK") {
                let response = await options.recipeImplementation.createEmailVerificationToken({
                    userId,
                    email: emailInfo.email,
                    tenantId,
                    userContext,
                });

                if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                    if ((await session.getClaimValue(EmailVerificationClaim)) !== true) {
                        // this can happen if the email was verified in another browser
                        // and this session is still outdated - and the user has not
                        // called the get email verification API yet.
                        await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
                    }
                    logDebugMessage(
                        `Email verification email not sent to ${emailInfo.email} because it is already verified.`
                    );
                    return response;
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
                    tenantId,
                });

                logDebugMessage(`Sending email verification email to ${emailInfo}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "EMAIL_VERIFICATION",
                    user: {
                        id: userId,
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
                logDebugMessage(
                    "generateEmailVerifyTokenPOST: Returning UNAUTHORISED because the user id provided is unknown"
                );
                throw new SessionError({ type: SessionError.UNAUTHORISED, message: "Unknown User ID provided" });
            }
        },
    };
}
