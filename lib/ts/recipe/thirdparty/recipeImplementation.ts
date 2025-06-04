import { RecipeInterface, ProviderInput } from "./types";
import { Querier } from "../../querier";
import { findAndCreateProviderInstance, mergeProvidersFromCoreAndStatic } from "./providers/configUtils";
import AccountLinking from "../accountlinking/recipe";
import MultitenancyRecipe from "../multitenancy/recipe";
import RecipeUserId from "../../recipeUserId";
import { getUser, listUsersByAccountInfo } from "../..";
import { User as UserType } from "../../types";
import { User } from "../../user";
import { AuthUtils } from "../../authUtils";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";

export default function getRecipeImplementation(querier: Querier, providers: ProviderInput[]): RecipeInterface {
    return {
        manuallyCreateOrUpdateUser: async function (
            this: RecipeInterface,
            {
                thirdPartyId,
                thirdPartyUserId,
                email,
                isVerified,
                tenantId,
                session,
                shouldTryLinkingWithSessionUser,
                userContext,
            }
        ) {
            const accountLinking = AccountLinking.getInstance();
            const users = await listUsersByAccountInfo(
                tenantId,
                { thirdParty: { id: thirdPartyId, userId: thirdPartyUserId } },
                false,
                userContext
            );

            const user = users[0];
            if (user !== undefined) {
                const isEmailChangeAllowed = await accountLinking.isEmailChangeAllowed({
                    user,
                    isVerified: isVerified,
                    newEmail: email,
                    session,
                    userContext: userContext,
                });
                if (!isEmailChangeAllowed.allowed) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason:
                            isEmailChangeAllowed.reason === "PRIMARY_USER_CONFLICT"
                                ? "Email already associated with another primary user."
                                : "New email cannot be applied to existing account because of account takeover risks.",
                    };
                }
            }
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/signinup",
                    params: {
                        tenantId: tenantId,
                    },
                },
                {
                    thirdPartyId,
                    thirdPartyUserId,
                    email: { id: email, isVerified },
                },
                userContext
            );

            if (response.status !== "OK") {
                return response;
            }

            let userAsObj = User.fromApi(response.user);
            const recipeUserIdAsObj = new RecipeUserId(response.recipeUserId);

            await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                user: userAsObj,
                recipeUserId: recipeUserIdAsObj,
                userContext,
            });

            // we do this so that we get the updated user (in case the above
            // function updated the verification status) and can return that
            userAsObj = (await getUser(recipeUserIdAsObj.getAsString(), userContext))!;

            const linkResult = await AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId,
                shouldTryLinkingWithSessionUser,
                inputUser: userAsObj,
                recipeUserId: recipeUserIdAsObj,
                session,
                userContext,
            });

            if (linkResult.status !== "OK") {
                return linkResult;
            }

            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewUser,
                user: linkResult.user,
                recipeUserId: recipeUserIdAsObj,
            };
        },

        signInUp: async function (
            this: RecipeInterface,
            {
                thirdPartyId,
                thirdPartyUserId,
                email,
                isVerified,
                tenantId,
                userContext,
                oAuthTokens,
                session,
                shouldTryLinkingWithSessionUser,
                rawUserInfoFromProvider,
            }
        ): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: UserType;
                  recipeUserId: RecipeUserId;
                  oAuthTokens: { [key: string]: any };
                  rawUserInfoFromProvider: {
                      fromIdTokenPayload?: { [key: string]: any };
                      fromUserInfoAPI?: { [key: string]: any };
                  };
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              }
        > {
            let response = await this.manuallyCreateOrUpdateUser({
                thirdPartyId,
                thirdPartyUserId,
                email,
                tenantId,
                isVerified,
                session,
                shouldTryLinkingWithSessionUser,
                userContext,
            });

            if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                return {
                    status: "SIGN_IN_UP_NOT_ALLOWED",
                    reason:
                        response.reason === "Email already associated with another primary user."
                            ? "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)"
                            : "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_024)",
                };
            }

            if (response.status === "OK") {
                return {
                    ...response,
                    oAuthTokens,
                    rawUserInfoFromProvider,
                };
            }

            return response;
        },

        getProvider: async function ({ thirdPartyId, tenantId, clientType, userContext }) {
            const mtRecipe = MultitenancyRecipe.getInstanceOrThrowError();
            const tenantConfig = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });

            if (tenantConfig === undefined) {
                throw new Error("Tenant not found");
            }

            const mergedProviders: ProviderInput[] = mergeProvidersFromCoreAndStatic(
                tenantConfig.thirdParty.providers,
                providers,
                tenantId === DEFAULT_TENANT_ID
            );

            const provider = await findAndCreateProviderInstance(
                mergedProviders,
                thirdPartyId,
                clientType,
                userContext
            );

            return provider;
        },
    };
}
