import { APIInterface, APIOptions, User } from "../";
import { logDebugMessage } from "../../../logger";
import Session from "../../session";
import EmailVerificationRecipe from "../recipe";
import { GeneralErrorResponse } from "../../../types";
import { EmailVerifiedClaim } from "../emailVerifiedClaim";

export default function getAPIInterface(): APIInterface {
    return {
        verifyEmailPOST: async function ({
            token,
            options,
            userContext,
        }: {
            token: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            { status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" } | GeneralErrorResponse
        > {
            // TODO: we could set isEmailVerified here if we have a session with the right user

            return await options.recipeImplementation.verifyEmailUsingToken({ token, userContext });
        },

        isEmailVerifiedGET: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  isVerified: boolean;
              }
            | GeneralErrorResponse
        > {
            let session = await Session.getSession(
                options.req,
                options.res,
                { overrideGlobalClaimValidators: () => [] },
                userContext
            );

            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            await session.fetchAndSetClaim(EmailVerifiedClaim, userContext);
            const isVerified = await session.getClaimValue(EmailVerifiedClaim, userContext);

            return {
                status: "OK",
                isVerified: isVerified === true,
            };
        },

        generateEmailVerifyTokenPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<{ status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR" } | GeneralErrorResponse> {
            let session = await Session.getSession(
                options.req,
                options.res,
                { overrideGlobalClaimValidators: () => [] },
                userContext
            );

            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            let userId = session.getUserId();

            let email = await EmailVerificationRecipe.getInstanceOrThrowError().getEmailForUserId(userId, userContext);

            let response = await options.recipeImplementation.createEmailVerificationToken({
                userId,
                email,
                userContext,
            });

            if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                logDebugMessage(`Email verification email not sent to ${email} because it is already verified.`);
                return response;
            }

            let emailVerifyLink =
                (await options.config.getEmailVerificationURL({ id: userId, email }, userContext)) +
                "?token=" +
                response.token +
                "&rid=" +
                options.recipeId;

            logDebugMessage(`Sending email verification email to ${email}`);
            await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                type: "EMAIL_VERIFICATION",
                user: {
                    id: userId,
                    email: email,
                },
                emailVerifyLink,
                userContext,
            });

            return {
                status: "OK",
            };
        },
    };
}
