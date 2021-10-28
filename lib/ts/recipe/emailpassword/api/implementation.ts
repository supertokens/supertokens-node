import { APIInterface, APIOptions, User } from "../";
import Session from "../../session";

export default function getAPIImplementation(): APIInterface {
    return {
        emailExistsGET: async function ({
            email,
            options,
        }: {
            email: string;
            options: APIOptions;
        }): Promise<{
            status: "OK";
            exists: boolean;
        }> {
            let user = await options.recipeImplementation.getUserByEmail({ email });

            return {
                status: "OK",
                exists: user !== undefined,
            };
        },
        generatePasswordResetTokenPOST: async function ({
            formFields,
            options,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
        }): Promise<{
            status: "OK";
        }> {
            let email = formFields.filter((f) => f.id === "email")[0].value;

            let user = await options.recipeImplementation.getUserByEmail({ email });
            if (user === undefined) {
                return {
                    status: "OK",
                };
            }

            let response = await options.recipeImplementation.createResetPasswordToken({ userId: user.id });
            if (response.status === "UNKNOWN_USER_ID_ERROR") {
                return {
                    status: "OK",
                };
            }

            let passwordResetLink =
                (await options.config.resetPasswordUsingTokenFeature.getResetPasswordURL(user)) +
                "?token=" +
                response.token +
                "&rid=" +
                options.recipeId;

            try {
                if (!options.isInServerlessEnv) {
                    options.config.resetPasswordUsingTokenFeature
                        .createAndSendCustomEmail(user, passwordResetLink)
                        .catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    await options.config.resetPasswordUsingTokenFeature.createAndSendCustomEmail(
                        user,
                        passwordResetLink
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
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            token: string;
            options: APIOptions;
        }): Promise<{
            status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
        }> {
            let newPassword = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.resetPasswordUsingToken({ token, newPassword });

            return response;
        },
        signInPOST: async function ({
            formFields,
            options,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
              }
            | {
                  status: "WRONG_CREDENTIALS_ERROR";
              }
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signIn({ email, password });
            if (response.status === "WRONG_CREDENTIALS_ERROR") {
                return response;
            }
            let user = response.user;

            await Session.createNewSession(options.res, user.id, {}, {});
            return {
                status: "OK",
                user,
            };
        },
        signUpPOST: async function ({
            formFields,
            options,
        }: {
            formFields: {
                id: string;
                value: string;
            }[];
            options: APIOptions;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
              }
            | {
                  status: "EMAIL_ALREADY_EXISTS_ERROR";
              }
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signUp({ email, password });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }
            let user = response.user;

            await Session.createNewSession(options.res, user.id, {}, {});
            return {
                status: "OK",
                user,
            };
        },
    };
}
