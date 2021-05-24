import { APIInterface, APIOptions, User } from "../";
import Session from "../../session";
import STError from "../error";

export default class APIImplementation implements APIInterface {
    verifyEmailPOST = async (token: string, options: APIOptions): Promise<{ status: "OK"; user: User }> => {
        let user = await options.recipeImplementation.verifyEmailUsingToken(token);

        return {
            status: "OK",
            user,
        };
    };

    isEmailVerifiedGET = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
        isVerified: boolean;
    }> => {
        let session = await Session.getSession(options.req, options.res);

        if (session === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("Session is undefined. Should not come here."),
            });
        }

        let userId = session.getUserId();

        let email = await options.config.getEmailForUserId(userId);

        let isVerified = await options.recipeImplementation.isEmailVerified(userId, email);

        return {
            status: "OK",
            isVerified,
        };
    };

    generateEmailVerifyTokenPOST = async (options: APIOptions): Promise<{ status: "OK" }> => {
        let session = await Session.getSession(options.req, options.res);

        if (session === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("Session is undefined. Should not come here."),
            });
        }

        let userId = session.getUserId();

        let email = await options.config.getEmailForUserId(userId);

        let token = await options.recipeImplementation.createEmailVerificationToken(userId, email);

        let emailVerifyLink =
            (await options.config.getEmailVerificationURL({ id: userId, email })) +
            "?token=" +
            token +
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
