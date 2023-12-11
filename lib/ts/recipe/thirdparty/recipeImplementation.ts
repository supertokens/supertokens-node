import { RecipeInterface, ProviderInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { findAndCreateProviderInstance, mergeProvidersFromCoreAndStatic } from "./providers/configUtils";
import AccountLinking from "../accountlinking/recipe";
import MultitenancyRecipe from "../multitenancy/recipe";
import RecipeUserId from "../../recipeUserId";
import { getUser } from "../..";
import { User as UserType } from "../../types";
import { User } from "../../user";

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
                userContext,
            }: {
                thirdPartyId: string;
                thirdPartyUserId: string;
                email: string;
                isVerified: boolean;
                tenantId: string;
                userContext: Record<string, any>;
            }
        ): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: UserType;
                  recipeUserId: RecipeUserId;
                  isValidFirstFactorForTenant: boolean | undefined;
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/${tenantId}/recipe/signinup`),
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

            response.user = new User(response.user);
            response.recipeUserId = new RecipeUserId(response.recipeUserId);

            await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                user: response.user,
                recipeUserId: response.recipeUserId,
                userContext,
            });

            // we do this so that we get the updated user (in case the above
            // function updated the verification status) and can return that
            response.user = (await getUser(response.recipeUserId.getAsString(), userContext))!;

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
                tenantId,
                user: response.user,
                userContext,
            });

            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewUser,
                user: updatedUser,
                recipeUserId: response.recipeUserId,
                isValidFirstFactorForTenant: response.isValidFirstFactorForTenant,
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
                rawUserInfoFromProvider,
            }: {
                thirdPartyId: string;
                thirdPartyUserId: string;
                email: string;
                isVerified: boolean;
                tenantId: string;
                userContext: Record<string, any>;
                oAuthTokens: { [key: string]: any };
                rawUserInfoFromProvider: {
                    fromIdTokenPayload?: { [key: string]: any };
                    fromUserInfoAPI?: { [key: string]: any };
                };
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
                  isValidFirstFactorForTenant: boolean | undefined;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            let response = await this.manuallyCreateOrUpdateUser({
                thirdPartyId,
                thirdPartyUserId,
                email,
                tenantId,
                isVerified,
                userContext,
            });

            if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                return {
                    status: "SIGN_IN_UP_NOT_ALLOWED",
                    reason:
                        "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)",
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
                providers
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
