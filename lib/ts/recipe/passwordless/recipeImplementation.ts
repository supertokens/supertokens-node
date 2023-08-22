import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import AccountLinking from "../accountlinking/recipe";
import NormalisedURLPath from "../../normalisedURLPath";
import EmailVerification from "../emailverification/recipe";
import { logDebugMessage } from "../../logger";
import { User } from "../../user";
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
            // TODO: this is not optimal
            const deviceInfo = await this.listCodesByPreAuthSessionId({
                tenantId: input.tenantId,
                preAuthSessionId: input.preAuthSessionId,
                userContext: input.userContext,
            });

            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code/consume`),
                copyAndRemoveUserContextAndTenantId(input)
            );

            if (response.status !== "OK") {
                return response;
            }

            if (deviceInfo === undefined) {
                // This means we successfully consumed a code using a preAuthSessionId
                // but the listing endpoint returned undefined for it
                throw new Error("Should never come here.");
            }

            logDebugMessage("Passwordless.consumeCode code consumed OK");
            response.user = new User(response.user);
            const loginMethod = response.user.loginMethods.find(
                (m: User["loginMethods"][number]) => m.recipeId === "passwordless"
            )!;
            if (loginMethod === undefined) {
                throw new Error("This should never happen: login method not found after signin");
            }
            if (loginMethod.email !== undefined) {
                logDebugMessage("Passwordless.consumeCode checking if email verification is initialized");
                const emailVerificationInstance = EmailVerification.getInstance();
                if (emailVerificationInstance) {
                    logDebugMessage("Passwordless.consumeCode checking email verification status");
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            tenantId: input.tenantId,
                            recipeUserId: loginMethod.recipeUserId,
                            email: loginMethod.email,
                            userContext: input.userContext,
                        }
                    );

                    if (tokenResponse.status === "OK") {
                        logDebugMessage("Passwordless.consumeCode verifying email address");
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            tenantId: input.tenantId,
                            token: tokenResponse.token,
                            attemptAccountLinking: false,
                            userContext: input.userContext,
                        });
                        // we do this so that we get the updated user (in case the above
                        // function updated the verification status) and can return that
                        response.user = await getUser(loginMethod.recipeUserId.getAsString(), input.userContext);
                    }
                }
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
                return response;
            }

            // We do this here and not in createNewOrUpdateEmailOfRecipeUser cause
            // createNewOrUpdateEmailOfRecipeUser is also called in post login account linking.
            let recipeUserId: RecipeUserId | undefined = undefined;
            for (let i = 0; i < response.user.loginMethods.length; i++) {
                const m = response.user.loginMethods[i];
                if (
                    m.recipeId === "passwordless" &&
                    (m.hasSameEmailAs(deviceInfo.email) || m.hasSamePhoneNumberAs(deviceInfo.phoneNumber))
                ) {
                    recipeUserId = m.recipeUserId;
                    break;
                }
            }

            if (recipeUserId === undefined) {
                throw new Error("Should never come here");
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
            };
        },
        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/code`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`/${input.tenantId}/recipe/signinup/codes/remove`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                new NormalisedURLPath(`${input.tenantId}/recipe/signinup/code/remove`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath(`${input.tenantId}/recipe/user`),
                copyAndRemoveUserContextAndTenantId(input)
            );
            return response;
        },
    };
}
