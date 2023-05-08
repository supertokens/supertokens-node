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
            | { status: "OK"; user: User; session?: SessionContainerInterface }
            | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }
            | GeneralErrorResponse
        > {
            const res = await options.recipeImplementation.verifyEmailUsingToken({ token, userContext });

            if (res.status === "OK") {
                await AccountLinking.getInstanceOrThrowError().createPrimaryUserIdOrLinkAccounts({
                    recipeUserId: res.user.recipeUserId,
                    isVerified: false,
                    checkAccountsToLinkTableAsWell: true,
                    userContext,
                });
                if (session !== undefined) {
                    // if (result.createNewSession) {
                    //     session = await createNewSession(
                    //         options.req,
                    //         options.res,
                    //         result.primaryUserId,
                    //         result.recipeUserId,
                    //         {},
                    //         {},
                    //         userContext
                    //     );
                    // }
                    try {
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
                }
                // checking if a new primaryUserId has been associated with recipeUserId
                // if user.id equals to user.recipeUserId, there are chances that
                // a primaryUserId, different from user.id got associated with the
                // recipe user. So we use getUser function
                if (res.user.id === res.user.recipeUserId) {
                    let user = await getUser(res.user.recipeUserId);
                    if (user === undefined) {
                        throw Error(
                            `this error should never be thrown. user not found after verification: ${res.user.recipeUserId}`
                        );
                    }
                    return {
                        status: "OK",
                        user: {
                            ...res.user,
                            id: user.id,
                        },
                        session,
                    };
                }
            }
            return res;
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
                        userId: recipeUserId,
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
                    userId: userIdForEmailVerification,
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
                throw new SessionError({ type: SessionError.UNAUTHORISED, message: "Unknown User ID provided" });
            }
        },
    };
}
