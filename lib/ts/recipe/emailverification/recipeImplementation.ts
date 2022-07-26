import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUserIdMapping, UserIdType } from "../useridmapping";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        createEmailVerificationToken: async function ({
            userId,
            email,
            userContext,
        }: {
            userId: string;
            email: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  token: string;
              }
            | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
        > {
            try {
                let userIdMappingResponse = await getUserIdMapping(userId, UserIdType.ANY, userContext);
                if (userIdMappingResponse.status === "OK") {
                    userId = userIdMappingResponse.superTokensUserId;
                }
            } catch (error) {
                // ignore errors
            }

            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token"), {
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
        },

        verifyEmailUsingToken: async function ({
            token,
            userContext,
        }: {
            token: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                method: "token",
                token,
            });
            if (response.status === "OK") {
                try {
                    let userIdMappingResponse = await getUserIdMapping(
                        response.userId,
                        UserIdType.SUPERTOKENS,
                        userContext
                    );
                    if (userIdMappingResponse.status === "OK") {
                        response.userId = userIdMappingResponse.externalUserId;
                    }
                } catch (error) {
                    // ignore errors
                }

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
        },

        isEmailVerified: async function ({
            userId,
            email,
            userContext,
        }: {
            userId: string;
            email: string;
            userContext: any;
        }): Promise<boolean> {
            try {
                let userIdMappingResponse = await getUserIdMapping(userId, UserIdType.ANY, userContext);
                if (userIdMappingResponse.status === "OK") {
                    userId = userIdMappingResponse.superTokensUserId;
                }
            } catch (error) {
                // ignore errors
            }

            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user/email/verify"), {
                userId,
                email,
            });
            return response.isVerified;
        },

        revokeEmailVerificationTokens: async function (input: {
            userId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK" }> {
            try {
                let userIdMappingResponse = await getUserIdMapping(input.userId, UserIdType.ANY, input.userContext);
                if (userIdMappingResponse.status === "OK") {
                    input.userId = userIdMappingResponse.superTokensUserId;
                }
            } catch (error) {
                // ignore errors
            }

            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token/remove"), {
                userId: input.userId,
                email: input.email,
            });
            return { status: "OK" };
        },

        unverifyEmail: async function (input: {
            userId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK" }> {
            try {
                let userIdMappingResponse = await getUserIdMapping(input.userId, UserIdType.ANY, input.userContext);
                if (userIdMappingResponse.status === "OK") {
                    input.userId = userIdMappingResponse.superTokensUserId;
                }
            } catch (error) {
                // ignore errors
            }

            await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/remove"), {
                userId: input.userId,
                email: input.email,
            });
            return { status: "OK" };
        },
    };
}
