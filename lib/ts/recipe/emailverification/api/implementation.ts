import { APIInterface, APIOptions, Error as STError } from "../";
import Recipe from "../recipe";
import Session from "../../session";

export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;

    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    verifyEmailPOST = async (token: string, options: APIOptions): Promise<{ status: "OK" }> => {
        let user = await options.recipeImplementation.verifyEmailUsingToken(token);

        this.recipeInstance.config.handlePostEmailVerification(user).catch((_) => {});

        return {
            status: "OK",
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
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("Session is undefined. Should not come here."),
                },
                this.recipeInstance
            );
        }

        let userId = session.getUserId();

        let email = await this.recipeInstance.config.getEmailForUserId(userId);

        let isVerified = await options.recipeImplementation.isEmailVerified(userId, email);

        return {
            status: "OK",
            isVerified,
        };
    };

    generateEmailVerifyTokenPOST = async (options: APIOptions): Promise<{ status: "OK" }> => {
        let session = await Session.getSession(options.req, options.res);

        if (session === undefined) {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("Session is undefined. Should not come here."),
                },
                this.recipeInstance
            );
        }

        let userId = session.getUserId();

        let email = await this.recipeInstance.config.getEmailForUserId(userId);

        let token = await options.recipeImplementation.createEmailVerificationToken(userId, email);

        let emailVerifyLink =
            (await this.recipeInstance.config.getEmailVerificationURL({ id: userId, email })) +
            "?token=" +
            token +
            "&rid=" +
            this.recipeInstance.getRecipeId();

        this.recipeInstance.config.createAndSendCustomEmail({ id: userId, email }, emailVerifyLink).catch((_) => {});

        return {
            status: "OK",
        };
    };
}
