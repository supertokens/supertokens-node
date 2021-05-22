import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import STError from "./error";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier) {
        this.querier = querier;
    }

    createEmailVerificationToken = async (userId: string, email: string): Promise<string> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token"), {
            userId,
            email,
        });
        if (response.status === "OK") {
            return response.token;
        } else {
            throw new STError({
                type: STError.EMAIL_ALREADY_VERIFIED_ERROR,
                message: "Failed to generated email verification token as the email is already verified",
            });
        }
    };

    verifyEmailUsingToken = async (token: string): Promise<User> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
            method: "token",
            token,
        });
        if (response.status === "OK") {
            return {
                id: response.userId,
                email: response.email,
            };
        } else {
            throw new STError({
                type: STError.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR,
                message: "Failed to verify email as the the token has expired or is invalid",
            });
        }
    };

    isEmailVerified = async (userId: string, email: string) => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
            userId,
            email,
        });
        return response.isVerified;
    };
}
