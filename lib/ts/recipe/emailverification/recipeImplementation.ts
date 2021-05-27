import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier) {
        this.querier = querier;
    }

    createEmailVerificationToken = async (
        userId: string,
        email: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
    > => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token"), {
            userId,
            email,
        });
        if (response.status === "OK") {
            return {
                status: "OK",
                token: response.token,
            };
        } else {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }
    };

    verifyEmailUsingToken = async (
        token: string
    ): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
            method: "token",
            token,
        });
        if (response.status === "OK") {
            return {
                status: "OK",
                user: {
                    id: response.userId,
                    email: response.email,
                },
            };
        } else {
            return {
                status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
            };
        }
    };

    isEmailVerified = async (
        userId: string,
        email: string
    ): Promise<{
        status: "OK";
        isVerified: boolean;
    }> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
            userId,
            email,
        });
        return {
            status: "OK",
            isVerified: response.isVerified,
        };
    };
}
