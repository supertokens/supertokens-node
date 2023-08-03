import { RecipeInterface, ProviderInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { findAndCreateProviderInstance, mergeProvidersFromCoreAndStatic } from "./providers/configUtils";
import AccountLinking from "../accountlinking/recipe";
import EmailVerification from "../emailverification";
import EmailVerificationRecipe from "../emailverification/recipe";
import MultitenancyRecipe from "../multitenancy/recipe";
import { mockCreateNewOrUpdateEmailOfRecipeUser } from "./mockCore";
import RecipeUserId from "../../recipeUserId";
import { getUser } from "../..";
import { User } from "../../types";

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
                userContext: any;
            }
        ): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            let response;
            if (process.env.MOCK !== "true") {
                response = await querier.sendPostRequest(new NormalisedURLPath(`/${tenantId}/recipe/signinup`), {
                    thirdPartyId,
                    thirdPartyUserId,
                    email: { id: email },
                });
            } else {
                response = await mockCreateNewOrUpdateEmailOfRecipeUser(
                    thirdPartyId,
                    thirdPartyUserId,
                    email,
                    tenantId,
                    querier
                );
            }

            if (response.status === "OK") {
                let recipeUserId: RecipeUserId | undefined = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].recipeId === "thirdparty" &&
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: thirdPartyId,
                            userId: thirdPartyUserId,
                        })
                    ) {
                        recipeUserId = response.user.loginMethods[i].recipeUserId;
                        break;
                    }
                }
                await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    tenantId,
                    recipeUserId: recipeUserId!,
                    userContext,
                });

                // The above may have marked the user's email as verified already, but in case
                // this is a sign up, or it's a sign in from a non primary user, and the
                // provider said that the user's email is verified, we should mark it as verified
                // here as well

                if (isVerified) {
                    let isInitialized = false;
                    try {
                        EmailVerificationRecipe.getInstanceOrThrowError();
                        isInitialized = true;
                    } catch (ignored) {}
                    if (isInitialized) {
                        let verifyResponse = await EmailVerification.createEmailVerificationToken(
                            tenantId,
                            recipeUserId!,
                            undefined,
                            userContext
                        );
                        if (verifyResponse.status === "OK") {
                            // we pass in false here cause we do not want to attempt account linking
                            // as of yet.
                            await EmailVerification.verifyEmailUsingToken(
                                tenantId,
                                verifyResponse.token,
                                false,
                                userContext
                            );
                        }
                    }
                }

                // we do this so that we get the updated user (in case the above
                // function updated the verification status) and can return that
                response.user = (await getUser(recipeUserId!.getAsString(), userContext))!;
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

            let userId = response.user.id;

            // We do this here and not in createNewOrUpdateEmailOfRecipeUser cause
            // createNewOrUpdateEmailOfRecipeUser is also called in post login account linking.
            let recipeUserId: RecipeUserId | undefined = undefined;
            for (let i = 0; i < response.user.loginMethods.length; i++) {
                if (
                    response.user.loginMethods[i].recipeId === "thirdparty" &&
                    response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                        id: thirdPartyId,
                        userId: thirdPartyUserId,
                    })
                ) {
                    recipeUserId = response.user.loginMethods[i].recipeUserId;
                    break;
                }
            }

            userId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId,
                recipeUserId: recipeUserId!,
                checkAccountsToLinkTableAsWell: true,
                userContext,
            });

            let updatedUser = await getUser(userId, userContext);

            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: updatedUser,
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
            }: {
                thirdPartyId: string;
                thirdPartyUserId: string;
                email: string;
                isVerified: boolean;
                tenantId: string;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  createdNewUser: boolean;
                  user: User;
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
                        "Cannot sign in / up because new email cannot be applied to existing account. Please contact support.",
                };
            }

            if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
                return response;
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
