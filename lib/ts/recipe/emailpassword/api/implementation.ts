import { APIInterface, APIOptions, User } from "../";
import { logDebugMessage } from "../../../logger";
import Session from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse } from "../../../types";

export default function getAPIImplementation(): APIInterface {
    return {
        postSignInAccountLinkingPOST: async function (_input: {
            formFields: {
                id: string;
                value: string;
            }[];
            session: SessionContainerInterface;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | {
                  status: "ACCOUNT_LINK_FAILURE";
                  reason: string;
                  contactSupport: boolean;
                  recipeUserCreated: boolean;
              }
            | GeneralErrorResponse
        > {
            return {
                status: "ACCOUNT_LINK_FAILURE",
                reason: "",
                contactSupport: false,
                recipeUserCreated: false,
            };
        },
        emailExistsGET: async function ({
            email,
            options,
            userContext,
        }: {
            email: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  exists: boolean;
              }
            | GeneralErrorResponse
        > {
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
        }): Promise<
            | {
                  status: "OK";
              }
            | { status: "PASSWORD_RESET_NOT_ALLOWED_CONTACT_SUPPORT" }
            | { status: "PROVIDE_RECIPE_USER_ID_AS_USER_ID_ERROR" }
            | GeneralErrorResponse
        > {
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
                logDebugMessage(`Password reset email not sent, unknown user id: ${user.id}`);
                return {
                    status: "OK",
                };
            }

            if (response.status === "PROVIDE_RECIPE_USER_ID_AS_USER_ID_ERROR") {
                return response;
            }

            let passwordResetLink =
                options.appInfo.websiteDomain.getAsStringDangerous() +
                options.appInfo.websiteBasePath.getAsStringDangerous() +
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
                  userId: string;
              }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
            | GeneralErrorResponse
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
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signIn({ email, password, userContext });
            if (response.status === "WRONG_CREDENTIALS_ERROR") {
                return response;
            }
            let user = response.user;

            let session = await Session.createNewSession(options.res, user.id, user.recipeUserId, {}, {}, userContext);
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
            | {
                  status: "SIGNUP_NOT_ALLOWED";
              }
            | GeneralErrorResponse
        > {
            let email = formFields.filter((f) => f.id === "email")[0].value;
            let password = formFields.filter((f) => f.id === "password")[0].value;

            let response = await options.recipeImplementation.signUp({ email, password, userContext });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }
            let user = response.user;

            let session = await Session.createNewSession(options.res, user.id, user.recipeUserId, {}, {}, userContext);
            return {
                status: "OK",
                session,
                user,
            };
        },
    };
}
