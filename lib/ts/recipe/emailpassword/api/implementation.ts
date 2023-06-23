import { APIInterface, APIOptions, User } from "../";
import { logDebugMessage } from "../../../logger";
import Session from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse } from "../../../types";
import MultitenancyRecipe from "../../../recipe/multitenancy/recipe";

export default function getAPIImplementation(): APIInterface {
    return {
        emailExistsGET: async function ({
            email,
            tenantId,
            options,
            userContext,
        }: {
            email: string;
            tenantId: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  exists: boolean;
              }
            | GeneralErrorResponse
        > {
            let user = await options.recipeImplementation.getUserByEmail({ email, tenantId, userContext });

            return {
                status: "OK",
                exists: user !== undefined,
            };
        },
        generatePasswordResetTokenPOST: async function ({
            formFields,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            tenantId: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;

            let user = await options.recipeImplementation.getUserByEmail({ email, tenantId, userContext });
            if (user === undefined) {
                return {
                    status: "OK",
                };
            }

            let response = await options.recipeImplementation.createResetPasswordToken({
                userId: user.id,
                tenantId,
                userContext,
            });
            if (response.status === "UNKNOWN_USER_ID_ERROR") {
                logDebugMessage(`Password reset email not sent, unknown user id: ${user.id}`);
                return {
                    status: "OK",
                };
            }

            const mtRecipe = MultitenancyRecipe.getInstanceOrThrowError();
            const domainAndBasePath = await mtRecipe.recipeInterfaceImpl.getWebsiteDomainAndBasePathForTenantId({
                tenantId,
                userContext,
            });

            let passwordResetLink =
                domainAndBasePath.domain +
                domainAndBasePath.basePath +
                "/reset-password?token=" +
                response.token +
                "&rid=" +
                options.recipeId;

            logDebugMessage(`Sending password reset email to ${email}`);
            await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                type: "PASSWORD_RESET",
                user,
                passwordResetLink,
                userContext,
            });

            return {
                status: "OK",
            };
        },
        passwordResetPOST: async function ({
            formFields,
            token,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            token: string;
            tenantId: string;
            options: APIOptions;
            userContext: any;
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
            | GeneralErrorResponse
        > {
            let newPassword = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.resetPasswordUsingToken({
                token,
                newPassword,
                tenantId,
                userContext,
            });

            return response;
        },
        signInPOST: async function ({
            formFields,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            tenantId: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "WRONG_CREDENTIALS_ERROR";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signIn({ email, password, tenantId, userContext });
            if (response.status === "WRONG_CREDENTIALS_ERROR") {
                return response;
            }
            let user = response.user;

            // TODO tenantId in create session
            let session = await Session.createNewSession(options.req, options.res, user.id, {}, {}, userContext);
            return {
                status: "OK",
                session,
                user,
            };
        },

        signUpPOST: async function ({
            formFields,
            tenantId,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            tenantId: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signUp({ email, password, tenantId, userContext });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }
            let user = response.user;

            // TODO tenantId in create session
            let session = await Session.createNewSession(options.req, options.res, user.id, {}, {}, userContext);
            return {
                status: "OK",
                session,
                user,
            };
        },
    };
}
