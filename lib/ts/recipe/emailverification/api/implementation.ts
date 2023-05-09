import { APIInterface, User } from "../";
import { logDebugMessage } from "../../../logger";
import EmailVerificationRecipe from "../recipe";
import { GeneralErrorResponse } from "../../../types";
import { EmailVerificationClaim } from "../emailVerificationClaim";
import SessionError from "../../session/error";
import { getEmailVerifyLink } from "../utils";
import { getUser } from "../../..";
import Session from "../../session";
import AccountLinking from "../../accountlinking/recipe";
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

            let primaryUserIdThatTheAccountWasLinkedTo = await AccountLinking.getInstanceOrThrowError().createPrimaryUserIdOrLinkAccounts(
                {
                    recipeUserId: verifyTokenResponse.user.recipeUserId,
                    isVerified: true,
                    checkAccountsToLinkTableAsWell: true,
                    session,
                    userContext,
                }
            );

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
                            await session.fetchAndSetClaim(EmailVerificationClaim, userContext);
                        } catch (err) {
                            // This should never happen, since we've just set the status above.
                            if ((err as Error).message === "UNKNOWN_USER_ID") {
                                throw new SessionError({
                                    type: SessionError.UNAUTHORISED,
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

                        // TODO: revoke all session belonging to session.getRecipeUserId()

                        let newSession = await Session.createNewSession(
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

                    // Removing of account linking claim is already done in the linkAccount recipe
                    // implementation if necessary, so we don't need to do anything in here.

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

            const emailInfo = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForUserId(
                userIdForEmailVerification,
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
                    recipeUserId: userIdForEmailVerification,
                    email: emailInfo.email,
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
                });

                logDebugMessage(`Sending email verification email to ${emailInfo}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
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
                throw new SessionError({ type: SessionError.UNAUTHORISED, message: "Unknown User ID provided" });
            }
        },
    };
}
