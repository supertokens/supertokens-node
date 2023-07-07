import { RecipeInterface, TypeNormalisedInput, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { FORM_FIELD_PASSWORD_ID } from "./constants";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";

export default function getRecipeInterface(
    querier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        signUp: async function ({
            email,
            password,
            tenantId,
        }: {
            email: string;
            password: string;
            tenantId: string;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/signup`),
                {
                    email,
                    password,
                }
            );
            if (response.status === "OK") {
                return response;
            } else {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
        },

        signIn: async function ({
            email,
            password,
            tenantId,
        }: {
            email: string;
            password: string;
            tenantId: string;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/signin`),
                {
                    email,
                    password,
                }
            );
            if (response.status === "OK") {
                return response;
            } else {
                return {
                    status: "WRONG_CREDENTIALS_ERROR",
                };
            }
        },

        getUserById: async function ({ userId }: { userId: string }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                userId,
            });
            if (response.status === "OK") {
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },

        getUserByEmail: async function ({
            email,
            tenantId,
        }: {
            email: string;
            tenantId: string;
        }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/user`),
                {
                    email,
                }
            );
            if (response.status === "OK") {
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },

        createResetPasswordToken: async function ({
            userId,
            tenantId,
        }: {
            userId: string;
            tenantId: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/user/password/reset/token`
                ),
                {
                    userId,
                }
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    token: response.token,
                };
            } else {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
        },

        resetPasswordUsingToken: async function ({
            token,
            newPassword,
            tenantId,
        }: {
            token: string;
            newPassword: string;
            tenantId: string;
        }): Promise<
            | {
                  status: "OK";
                  /**
                   * The id of the user whose password was reset.
                   * Defined for Core versions 3.9 or later
                   */
                  userId?: string;
              }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
        > {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/user/password/reset`
                ),
                {
                    method: "token",
                    token,
                    newPassword,
                }
            );
            return response;
        },

        updateEmailOrPassword: async function (input: {
            userId: string;
            email?: string;
            password?: string;
            applyPasswordPolicy?: boolean;
            tenantIdForPasswordPolicy: string;
        }): Promise<
            | {
                  status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
        > {
            if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                if (input.password !== undefined) {
                    const passwordField = formFields.filter((el) => el.id === FORM_FIELD_PASSWORD_ID)[0];
                    const error = await passwordField.validate(input.password, input.tenantIdForPasswordPolicy);
                    if (error !== undefined) {
                        return {
                            status: "PASSWORD_POLICY_VIOLATED_ERROR",
                            failureReason: error,
                        };
                    }
                }
            }
            let response = await querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), {
                userId: input.userId,
                email: input.email,
                password: input.password,
            });
            if (response.status === "OK") {
                return {
                    status: "OK",
                };
            } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            } else {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
        },
    };
}
