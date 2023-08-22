import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import { FORM_FIELD_PASSWORD_ID } from "./constants";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { User as UserType } from "../../types";
import { User } from "../../user";

export default function getRecipeInterface(
    querier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        signUp: async function (
            this: RecipeInterface,
            {
                email,
                password,
                tenantId,
                userContext,
            }: {
                email: string;
                password: string;
                tenantId: string;
                userContext: any;
            }
        ): Promise<{ status: "OK"; user: UserType } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            const response = await this.createNewRecipeUser({
                email,
                password,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }

            let updatedUser = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId,
                user: response.user,
                userContext,
            });

            return {
                status: "OK",
                user: updatedUser,
            };
        },

        createNewRecipeUser: async function (input: {
            tenantId: string;
            email: string;
            password: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
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
                }
            );
            if (resp.status === "OK") {
                resp.user = new User(resp.user);
            }
            return resp;

            // we do not do email verification here cause it's a new user and email password
            // users are always initially unverified.
        },

        signIn: async function ({
            email,
            password,
            tenantId,
            userContext,
        }: {
            email: string;
            password: string;
            tenantId: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: UserType } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            const response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/signin`),
                {
                    email,
                    password,
                }
            );

            if (response.status === "OK") {
                response.user = new User(response.user);

                let recipeUserId: RecipeUserId | undefined = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].recipeId === "emailpassword" &&
                        response.user.loginMethods[i].hasSameEmailAs(email)
                    ) {
                        recipeUserId = response.user.loginMethods[i].recipeUserId;
                        break;
                    }
                }
                await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    tenantId,
                    user: response.user,
                    recipeUserId: recipeUserId!,
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
                response.user = (await getUser(recipeUserId!.getAsString(), userContext))!;
            }

            return response;
        },

        createResetPasswordToken: async function ({
            userId,
            email,
            tenantId,
        }: {
            userId: string;
            email: string;
            tenantId: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/user/password/reset/token`
                ),
                {
                    userId,
                    email,
                }
            );
        },

        consumePasswordResetToken: async function ({
            token,
            tenantId,
        }: {
            token: string;
            tenantId: string;
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
                }
            );
        },

        updateEmailOrPassword: async function (input: {
            recipeUserId: RecipeUserId;
            email?: string;
            password?: string;
            applyPasswordPolicy?: boolean;
            tenantIdForPasswordPolicy: string;
            userContext: any;
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
                    const error = await passwordField.validate(input.password, input.tenantIdForPasswordPolicy);
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
                new NormalisedURLPath(`${input.tenantIdForPasswordPolicy}/recipe/user`),
                {
                    recipeUserId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                }
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
                    tenantId: input.tenantIdForPasswordPolicy,
                    user,
                    recipeUserId: input.recipeUserId,
                    userContext: input.userContext,
                });
            }

            return response;
        },
    };
}
