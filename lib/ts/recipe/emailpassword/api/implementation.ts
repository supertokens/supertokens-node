import { APIInterface, APIOptions, User } from "../";
import Session from "../../session";
import { SessionContainerInterface } from "../../session/types";

export default function getAPIImplementation(): APIInterface {
    return {
        emailExistsGET: async function ({
            email,
            options,
            userContext,
        }: {
            email: string;
            options: APIOptions;
            userContext: any;
        }): Promise<{
            status: "OK";
            exists: boolean;
        }> {
            let user = await options.recipeImplementation.getUserByEmail({ email, userContext });

            return {
                status: "OK",
                exists: user !== undefined,
            };
        },
        generatePasswordResetTokenPOST: async function ({
            formFields,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
            userContext: any;
        }): Promise<{
            status: "OK";
        }> {
            let email = formFields.filter((f) => f.id === "email")[0].value;

            let user = await options.recipeImplementation.getUserByEmail({ email, userContext });
            if (user === undefined) {
                return {
                    status: "OK",
                };
            }

            let response = await options.recipeImplementation.createResetPasswordToken({
                userId: user.id,
                userContext,
            });
            if (response.status === "UNKNOWN_USER_ID_ERROR") {
                return {
                    status: "OK",
                };
            }

            let passwordResetLink =
                (await options.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user, userContext)) +
                "?token=" +
                response.token +
                "&rid=" +
                options.recipeId;

            try {
                if (!options.isInServerlessEnv) {
                    options.config.resetPasswordUsingTokenFeature
                        .createAndSendCustomEmail(user, passwordResetLink, userContext)
                        .catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    await options.config.resetPasswordUsingTokenFeature.createAndSendCustomEmail(
                        user,
                        passwordResetLink,
                        userContext
                    );
                }
            } catch (_) {}

            return {
                status: "OK",
            };
        },
        passwordResetPOST: async function ({
            formFields,
            token,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            token: string;
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
        > {
            let newPassword = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.resetPasswordUsingToken({
                token,
                newPassword,
                userContext,
            });

            return response;
        },
        signInPOST: async function ({
            formFields,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
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
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signIn({ email, password, userContext });
            if (response.status === "WRONG_CREDENTIALS_ERROR") {
                return response;
            }
            let user = response.user;

            let session = await Session.createNewSession(options.res, user.id, {}, {}, userContext);
            return {
                status: "OK",
                session,
                user,
            };
        },
        signUpPOST: async function ({
            formFields,
            options,
            userContext,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
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
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signUp({ email, password, userContext });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }
            let user = response.user;

            let session = await Session.createNewSession(options.res, user.id, {}, {}, userContext);
            return {
                status: "OK",
                session,
                user,
            };
        },
    };
}
