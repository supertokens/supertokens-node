import { APIInterface, APIOptions, User } from "../";
import Session from "../../session";

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
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            return await options.recipeImplementation.verifyEmailUsingToken({ token, userContext });
        },

        isEmailVerifiedGET: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<{
            status: "OK";
            isVerified: boolean;
        }> {
            let session = await Session.getSession(options.req, options.res, userContext);

            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            let userId = session.getUserId();

            let email = await options.config.getEmailForUserId(userId, userContext);

            return {
                status: "OK",
                isVerified: await options.recipeImplementation.isEmailVerified({ userId, email, userContext }),
            };
        },

        generateEmailVerifyTokenPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<{ status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR" }> {
            let session = await Session.getSession(options.req, options.res, userContext);

            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            let userId = session.getUserId();

            let email = await options.config.getEmailForUserId(userId, userContext);

            let response = await options.recipeImplementation.createEmailVerificationToken({
                userId,
                email,
                userContext,
            });

            if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                return response;
            }

            let emailVerifyLink =
                (await options.config.getEmailVerificationURL({ id: userId, email }, userContext)) +
                "?token=" +
                response.token +
                "&rid=" +
                options.recipeId;

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
