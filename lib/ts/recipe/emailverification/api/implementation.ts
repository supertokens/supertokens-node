import { APIInterface, User } from "../";
import { logDebugMessage } from "../../../logger";
import EmailVerificationRecipe from "../recipe";
import { GeneralErrorResponse } from "../../../types";
import { EmailVerificationClaim } from "../emailVerificationClaim";
import SessionError from "../../session/error";
import { getEmailVerifyLink } from "../utils";
import { getUser } from "../../..";
import Session from "../../session";
import { AccountLinkingClaim } from "../../accountlinking/accountLinkingClaim";
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
                  session: SessionContainerInterface;
              }
            | GeneralErrorResponse
        > {
            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            const userId = session.getUserId();
            const recipeUserId = session.getRecipeUserId();

            let user = await getUser(recipeUserId, userContext);

            if (user === undefined) {
                throw Error(`this error should not be thrown. session recipe user not found: ${userId}`);
            }
            if (user.isPrimaryUser) {
                if (user.id !== userId) {
                    session = await Session.createNewSession(
                        options.res,
                        user.id,
                        recipeUserId,
                        session.getAccessTokenPayload(),
                        await session.getSessionDataFromDatabase()
                    );
                }
            }

            let recipeUserIdFromSessionClaim = await session.getClaimValue(AccountLinkingClaim, userContext);
            if (recipeUserIdFromSessionClaim === undefined) {
                recipeUserIdFromSessionClaim = recipeUserId;
            }

            let recipeUser = user.loginMethods.find((u) => u.recipeUserId === recipeUserId);

            if (recipeUser === undefined) {
                throw Error(`this error should not be thrown. recipe user not found: ${userId}`);
            }

            let isRecipeUserAccountVerified = recipeUser.verified;

            let userIdForEmailVerification: string;

            if (recipeUserIdFromSessionClaim === recipeUserId || !isRecipeUserAccountVerified) {
                userIdForEmailVerification = recipeUserId;
            } else {
                userIdForEmailVerification = recipeUserIdFromSessionClaim;
            }

            let isVerified: boolean | undefined;

            if (userIdForEmailVerification === recipeUserId) {
                try {
                    await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
                } catch (err) {
                    if ((err as Error).message === "UNKNOWN_USER_ID") {
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Unknown User ID provided",
                        });
                    }
                    throw err;
                }
                isVerified = await session.getClaimValue(EmailVerificationClaim, userContext);
            } else {
                const recipe = EmailVerificationRecipe.getInstanceOrThrowError();
                let emailInfo = await recipe.getEmailForUserId(recipeUserId, userContext);

                if (emailInfo.status === "OK") {
                    isVerified = await recipe.recipeInterfaceImpl.isEmailVerified({
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
        },

        generateEmailVerifyTokenPOST: async function (
            this: APIInterface,
            { options, userContext, session }
        ): Promise<{ status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR" } | GeneralErrorResponse> {
            // In this API, we generate the email verification token for session's recipe user ID.
            // The exception is that if the account linking claim exists in the session,
            // then we will generate the token for that cause that claim implies that we
            // are trying to link that recipe ID to the current session's primary user ID.

            // Either way, in case the email is already verified, we do the same thing
            // as what happens in the verifyEmailPOST API post email verification (cause maybe the session is outdated).

            let recipeUserIdForWhomToGenerateToken = session.getRecipeUserId();
            const fromAccountLinkingClaim = await session.getClaimValue(AccountLinkingClaim, userContext);
            if (fromAccountLinkingClaim !== undefined) {
                // this means that the claim exists and so we will generate the token for that user id
                recipeUserIdForWhomToGenerateToken = fromAccountLinkingClaim;

                // there is a possibility that this user ID is not a recipe user ID anymore
                // (cause of some race condition), but that shouldn't matter much anyway.
            }

            const emailInfo = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForUserId(
                recipeUserIdForWhomToGenerateToken,
                userContext
            );

            if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                logDebugMessage(
                    `Email verification email not sent to user ${recipeUserIdForWhomToGenerateToken} because it doesn't have an email address.`
                );
                // this can happen if the user ID was found, but it has no email. In this
                // case, we treat it as a success case.

                // TODO: do the same stuff we do in email verify post API
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                };
            } else if (emailInfo.status === "OK") {
                let response = await options.recipeImplementation.createEmailVerificationToken({
                    recipeUserId: recipeUserIdForWhomToGenerateToken,
                    email: emailInfo.email,
                    userContext,
                });

                if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                    // TODO: do the same stuff we do in email verify POST API
                    return response;
                }

                if (recipeUserIdForWhomToGenerateToken === session.getRecipeUserId()) {
                    // we have the above ID cause we only want to do the below if the
                    // account linking claim is not present. This is cause the email
                    // verification claim is only specific to the current session's user ID.
                    if ((await session.getClaimValue(EmailVerificationClaim)) !== false) {
                        // this can happen if the email was unverified in another browser
                        // and this session is still outdated - and the user has not
                        // called the get email verification API yet.
                        await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
                    }
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
                throw new SessionError({ type: SessionError.UNAUTHORISED, message: "Unknown User ID provided" });
            }
        },
    };
}
