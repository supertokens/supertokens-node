import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import { FORM_FIELD_PASSWORD_ID } from "./constants";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { UserContext, User as UserType } from "../../types";
import { LoginMethod, User } from "../../user";
import { AuthUtils } from "../../authUtils";

export default function getRecipeInterface(
    querier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        signUp: async function (
            this: RecipeInterface,
            { email, password, tenantId, session, userContext }
        ): Promise<
            | {
                  status: "OK";
                  user: UserType;
                  recipeUserId: RecipeUserId;
              }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              }
        > {
            const response = await this.createNewRecipeUser({
                email,
                password,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }

            let updatedUser = response.user;

            const linkResult = await AuthUtils.linkToSessionIfProvidedElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId,
                inputUser: response.user,
                recipeUserId: response.recipeUserId,
                session,
                userContext,
            });

            if (linkResult.status != "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;

            return {
                status: "OK",
                user: updatedUser,
                recipeUserId: response.recipeUserId,
            };
        },

        createNewRecipeUser: async function (input: {
            tenantId: string;
            email: string;
            password: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            const resp = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId}/recipe/signup`
                ),
                {
                    email: input.email,
                    password: input.password,
                },
                input.userContext
            );
            if (resp.status === "OK") {
                return {
                    status: "OK",
                    user: new User(resp.user),
                    recipeUserId: new RecipeUserId(resp.recipeUserId),
                };
            }
            return resp;

            // we do not do email verification here cause it's a new user and email password
            // users are always initially unverified.
        },

        signIn: async function (this: RecipeInterface, { email, password, tenantId, session, userContext }) {
            const response = await this.verifyCredentials({ email, password, tenantId, userContext });

            if (response.status === "OK") {
                const loginMethod: LoginMethod = response.user.loginMethods.find(
                    (lm: LoginMethod) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
                )!;

                if (!loginMethod.verified) {
                    await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                        user: response.user,
                        recipeUserId: response.recipeUserId,
                        userContext,
                    });

                    // Unlike in the sign up recipe function, we do not do account linking here
                    // cause we do not want sign in to change the potentially user ID of a user
                    // due to linking when this function is called by the dev in their API -
                    // for example in their update password API. If we did account linking
                    // then we would have to ask the dev to also change the session
                    // in such API calls.
                    // In the case of sign up, since we are creating a new user, it's fine
                    // to link there since there is no user id change really from the dev's
                    // point of view who is calling the sign up recipe function.

                    // We do this so that we get the updated user (in case the above
                    // function updated the verification status) and can return that
                    response.user = (await getUser(response.recipeUserId!.getAsString(), userContext))!;
                }

                const linkResult = await AuthUtils.linkToSessionIfProvidedElseCreatePrimaryUserIdOrLinkByAccountInfo({
                    tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session,
                    userContext,
                });
                if (linkResult.status === "LINKING_TO_SESSION_USER_FAILED") {
                    return linkResult;
                }
                response.user = linkResult.user;
            }

            return response;
        },

        verifyCredentials: async function ({
            email,
            password,
            tenantId,
            userContext,
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | { status: "WRONG_CREDENTIALS_ERROR" }
        > {
            const response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/signin`),
                {
                    email,
                    password,
                },
                userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    user: new User(response.user),
                    recipeUserId: new RecipeUserId(response.recipeUserId),
                };
            }

            return {
                status: "WRONG_CREDENTIALS_ERROR",
            };
        },

        createResetPasswordToken: async function ({
            userId,
            email,
            tenantId,
            userContext,
        }: {
            userId: string;
            email: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/user/password/reset/token`
                ),
                {
                    userId,
                    email,
                },
                userContext
            );
        },

        consumePasswordResetToken: async function ({
            token,
            tenantId,
            userContext,
        }: {
            token: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  userId: string;
                  email: string;
              }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
        > {
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/user/password/reset/token/consume`
                ),
                {
                    method: "token",
                    token,
                },
                userContext
            );
        },

        updateEmailOrPassword: async function (input: {
            recipeUserId: RecipeUserId;
            email?: string;
            password?: string;
            applyPasswordPolicy?: boolean;
            tenantIdForPasswordPolicy: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
        > {
            if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                if (input.password !== undefined) {
                    const passwordField = formFields.filter((el) => el.id === FORM_FIELD_PASSWORD_ID)[0];
                    const error = await passwordField.validate(
                        input.password,
                        input.tenantIdForPasswordPolicy,
                        input.userContext
                    );
                    if (error !== undefined) {
                        return {
                            status: "PASSWORD_POLICY_VIOLATED_ERROR",
                            failureReason: error,
                        };
                    }
                }
            }

            // We do not check for AccountLinking.isEmailChangeAllowed here cause
            // that may return false if the user's email is not verified, and this
            // function should not fail due to lack of email verification - since it's
            // really up to the developer to decide what should be the pre condition for
            // a change in email. The check for email verification should actually go in
            // an update email API (post login update).

            let response = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/user`),
                {
                    recipeUserId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                },
                input.userContext
            );

            if (response.status === "OK") {
                const user = await getUser(input.recipeUserId.getAsString(), input.userContext);
                if (user === undefined) {
                    // This means that the user was deleted between the put and get requests
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
                await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    user,
                    recipeUserId: input.recipeUserId,
                    userContext: input.userContext,
                });
            }

            return response;
        },
    };
}
