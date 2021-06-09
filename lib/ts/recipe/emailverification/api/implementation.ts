import { APIInterface, APIOptions, User } from "../";
import Session from "../../session";

export default class APIImplementation implements APIInterface {
    verifyEmailPOST = async ({
        token,
        options,
    }: {
        token: string;
        options: APIOptions;
    }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> => {
        return await options.recipeImplementation.verifyEmailUsingToken({ token });
    };

    isEmailVerifiedGET = async ({
        options,
    }: {
        options: APIOptions;
    }): Promise<{
        status: "OK";
        isVerified: boolean;
    }> => {
        let session = await Session.getSession(options.req, options.res);

        if (session === undefined) {
            throw new Error("Session is undefined. Should not come here.");
        }

        let userId = session.getUserId();

        let email = await options.config.getEmailForUserId(userId);

        return {
            status: "OK",
            isVerified: await options.recipeImplementation.isEmailVerified({ userId, email }),
        };
    };

    generateEmailVerifyTokenPOST = async ({
        options,
    }: {
        options: APIOptions;
    }): Promise<{ status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR" }> => {
        let session = await Session.getSession(options.req, options.res);

        if (session === undefined) {
            throw new Error("Session is undefined. Should not come here.");
        }

        let userId = session.getUserId();

        let email = await options.config.getEmailForUserId(userId);

        let response = await options.recipeImplementation.createEmailVerificationToken({ userId, email });

        if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return response;
        }

        let emailVerifyLink =
            (await options.config.getEmailVerificationURL({ id: userId, email })) +
            "?token=" +
            response.token +
            "&rid=" +
            options.recipeId;

        try {
            options.config.createAndSendCustomEmail({ id: userId, email }, emailVerifyLink).catch((_) => {});
        } catch (ignored) {}

        return {
            status: "OK",
        };
    };
}
