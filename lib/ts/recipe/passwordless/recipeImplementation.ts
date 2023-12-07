import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import AccountLinking from "../accountlinking/recipe";
import NormalisedURLPath from "../../normalisedURLPath";
import { logDebugMessage } from "../../logger";
import { LoginMethod, User } from "../../user";
import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    function copyAndRemoveUserContextAndTenantId(input: any): any {
        let result = {
            ...input,
        };
        delete result.userContext;
        delete result.tenantId;
        if (result.recipeUserId !== undefined && result.recipeUserId.getAsString !== undefined) {
            result.recipeUserId = result.recipeUserId.getAsString();
        }
        return result;
    }

    return {
        consumeCode: async function (this: RecipeInterface, input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code/consume`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );

            if (response.status !== "OK") {
                return response;
            }

            logDebugMessage("Passwordless.consumeCode code consumed OK");
            response.user = new User(response.user);
            response.recipeUserId = new RecipeUserId(response.recipeUserId);

            const loginMethod = response.user.loginMethods.find(
                (lm: LoginMethod) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
            )!;
            if (loginMethod === undefined) {
                throw new Error("This should never happen: login method not found after signin");
            }

            if (!response.createdNewUser) {
                // Unlike in the sign up scenario, we do not do account linking here
                // cause we do not want sign in to change the potentially user ID of a user
                // due to linking when this function is called by the dev in their API.
                // If we did account linking
                // then we would have to ask the dev to also change the session
                // in such API calls.
                // In the case of sign up, since we are creating a new user, it's fine
                // to link there since there is no user id change really from the dev's
                // point of view who is calling the sign up recipe function.
                return {
                    status: "OK",
                    createdNewRecipeUser: response.createdNewUser,
                    user: response.user,
                    recipeUserId: response.recipeUserId,
                    isValidFirstFactorForTenant: response.isValidFirstFactorForTenant,
                };
            }

            let updatedUser = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId: input.tenantId,
                user: response.user,
                userContext: input.userContext,
            });

            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewUser,
                user: updatedUser,
                recipeUserId: response.recipeUserId,
                isValidFirstFactorForTenant: response.isValidFirstFactorForTenant,
            };
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes/remove`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code/remove`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/user`),
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            if (response.status !== "OK") {
                return response;
            }
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
            return response;
        },
    };
}
