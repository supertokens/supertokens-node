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
import { AuthUtils } from "../../authUtils";

export default function getRecipeImplementation(querier: Querier, providers: ProviderInput[]): RecipeInterface {
    return {
        manuallyCreateOrUpdateUser: async function (
            this: RecipeInterface,
            { thirdPartyId, thirdPartyUserId, email, isVerified, tenantId, session, userContext }
        ) {
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

            const linkResult = await AuthUtils.linkToSessionIfProvidedElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId,
                inputUser: response.user,
                recipeUserId: response.recipeUserId,
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
                recipeUserId: response.recipeUserId,
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
