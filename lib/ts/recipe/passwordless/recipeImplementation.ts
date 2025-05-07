import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import AccountLinking from "../accountlinking/recipe";
import EmailVerification from "../emailverification/recipe";
import { logDebugMessage } from "../../logger";
import { User } from "../../user";
import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";
import { AuthUtils } from "../../authUtils";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    function copyAndRemoveUserContextAndTenantId(input: any): any {
        let result = {
            ...input,
        };
        delete result.userContext;
        delete result.tenantId;
        delete result.session;
        if (result.recipeUserId !== undefined && result.recipeUserId.getAsString !== undefined) {
            result.recipeUserId = result.recipeUserId.getAsString();
        }
        return result;
    }

    return {
        consumeCode: async function (this: RecipeInterface, input) {
            const response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code/consume",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );

            if (response.status !== "OK") {
                return response;
            }

            logDebugMessage("Passwordless.consumeCode code consumed OK");

            const userAsObj = User.fromApi(response.user);
            const recipeUserIdAsObj = new RecipeUserId(response.recipeUserId);

            // Attempt account linking (this is a sign up)
            let updatedUser = userAsObj;

            const linkResult = await AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId: input.tenantId,
                inputUser: userAsObj,
                recipeUserId: recipeUserIdAsObj,
                session: input.session,
                shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
                userContext: input.userContext,
            });

            if (linkResult.status !== "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;

            return {
                ...response,
                consumedDevice: response.consumedDevice,
                createdNewRecipeUser: response.createdNewUser,
                user: updatedUser,
                recipeUserId: recipeUserIdAsObj,
            };
        },

        checkCode: async function (this: RecipeInterface, input) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code/check",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );

            if (response.status !== "OK") {
                return response;
            }

            logDebugMessage("Passwordless.checkCode code verified");

            return response;
        },

        createCode: async function (input) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        createNewCodeForDevice: async function (input) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response;
        },
        listCodesByDeviceId: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        listCodesByEmail: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPhoneNumber: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices;
        },
        listCodesByPreAuthSessionId: async function (input) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return response.devices.length === 1 ? response.devices[0] : undefined;
        },
        revokeAllCodes: async function (input) {
            await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/codes/remove",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return {
                status: "OK",
            };
        },
        revokeCode: async function (input) {
            await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup/code/remove",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                copyAndRemoveUserContextAndTenantId(input),
                input.userContext
            );
            return { status: "OK" };
        },
        updateUser: async function (input) {
            const accountLinking = AccountLinking.getInstance();
            if (input.email) {
                const user = await getUser(input.recipeUserId.getAsString(), input.userContext);

                if (user === undefined) {
                    return { status: "UNKNOWN_USER_ID_ERROR" };
                }

                const evInstance = EmailVerification.getInstance();

                let isEmailVerified = false;
                if (evInstance) {
                    isEmailVerified = await evInstance.recipeInterfaceImpl.isEmailVerified({
                        recipeUserId: input.recipeUserId,
                        email: input.email,
                        userContext: input.userContext,
                    });
                }
                const isEmailChangeAllowed = await accountLinking.isEmailChangeAllowed({
                    user,
                    isVerified: isEmailVerified,
                    newEmail: input.email,
                    session: undefined,
                    userContext: input.userContext,
                });
                if (!isEmailChangeAllowed.allowed) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason:
                            isEmailChangeAllowed.reason === "ACCOUNT_TAKEOVER_RISK"
                                ? "New email cannot be applied to existing account because of account takeover risks."
                                : "New email cannot be applied to existing account because of there is another primary user with the same email address.",
                    };
                }
            }
            let response = await querier.sendPutRequest(
                "/recipe/user",
                copyAndRemoveUserContextAndTenantId(input),
                {},
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
