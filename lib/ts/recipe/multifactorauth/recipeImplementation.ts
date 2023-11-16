import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import UserMetadataRecipe from "../usermetadata/recipe";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import RecipeUserId from "../../recipeUserId";
import { User } from "../../user";
import NormalisedURLPath from "../../normalisedURLPath";
import type MultiFactorAuthRecipe from "./recipe";
import TotpRecipe from "../totp/recipe";

export default function getRecipeInterface(querier: Querier, recipeInstance: MultiFactorAuthRecipe): RecipeInterface {
    return {
        getFactorsSetupForUser: async function ({ tenantId, user, userContext }) {
            const setupFactorsFromOtherRecipes = recipeInstance.getFactorsSetupByOtherRecipes();
            const factorsSetupForUser: Set<string> = new Set();

            for (const loginMethod of user.loginMethods) {
                if (!loginMethod.tenantIds.includes(tenantId)) {
                    continue;
                }

                if (
                    loginMethod.recipeId === "emailpassword" &&
                    setupFactorsFromOtherRecipes.includes("emailpassword")
                ) {
                    factorsSetupForUser.add("emailpassword");
                }

                if (loginMethod.recipeId === "thirdparty" && setupFactorsFromOtherRecipes.includes("thirdparty")) {
                    factorsSetupForUser.add("thirdparty");
                }

                if (loginMethod.email !== undefined && loginMethod.verified) {
                    if (setupFactorsFromOtherRecipes.includes("otp-email")) {
                        factorsSetupForUser.add("otp-email");
                    }
                    if (setupFactorsFromOtherRecipes.includes("link-email")) {
                        factorsSetupForUser.add("link-email");
                    }
                }

                if (loginMethod.phoneNumber !== undefined) {
                    if (setupFactorsFromOtherRecipes.includes("otp-phone")) {
                        factorsSetupForUser.add("otp-phone");
                    }
                    if (setupFactorsFromOtherRecipes.includes("link-phone")) {
                        factorsSetupForUser.add("link-phone");
                    }
                }
            }

            const totpRecipeInstance = TotpRecipe.getInstance();
            if (totpRecipeInstance !== undefined) {
                const deviceRes = await totpRecipeInstance.recipeInterfaceImpl.listDevices({
                    userId: user.id,
                    userContext,
                });
                for (const device of deviceRes.devices) {
                    if (device.verified) {
                        factorsSetupForUser.add("totp");
                        break;
                    }
                }
            }

            return [...factorsSetupForUser];
        },

        getMFARequirementsForAuth: async function ({
            defaultRequiredFactorIdsForUser,
            defaultRequiredFactorIdsForTenant,
        }) {
            const allFactors: Set<string> = new Set();
            for (const factor of defaultRequiredFactorIdsForUser) {
                allFactors.add(factor);
            }
            for (const factor of defaultRequiredFactorIdsForTenant) {
                allFactors.add(factor);
            }

            return [{ oneOf: [...allFactors] }];
        },

        isAllowedToSetupFactor: async function (
            this: RecipeInterface,
            {
                factorId,
                session,
                completedFactors,
                defaultRequiredFactorIdsForTenant,
                defaultRequiredFactorIdsForUser,
                factorsSetUpByTheUser,
                userContext,
            }
        ) {
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                completedFactors,
                defaultRequiredFactorIdsForTenant,
                defaultRequiredFactorIdsForUser,
                factorsSetUpByTheUser,
                userContext,
            });

            const nextFactors = MultiFactorAuthClaim.buildNextArray(completedFactors, mfaRequirementsForAuth);
            return nextFactors.length === 0 || nextFactors.includes(factorId);
        },

        markFactorAsCompleteInSession: async function ({ session, factorId, userContext }) {
            const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
            const completed = {
                ...currentValue?.c,
                [factorId]: Math.floor(Date.now() / 1000),
            };
            const setupUserFactors = await this.recipeInterfaceImpl.getFactorsSetupForUser({
                userId: session.getUserId(),
                tenantId: session.getTenantId(),
                userContext,
            });
            const requirements = await this.config.getMFARequirementsForAuth(
                session,
                setupUserFactors,
                completed,
                userContext
            );
            const next = MultiFactorAuthClaim.buildNextArray(completed, requirements);
            await session.setClaimValue(MultiFactorAuthClaim, {
                c: completed,
                n: next,
            });
        },

        addToDefaultRequiredFactorsForUser: async function ({ tenantId, user, factorId, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });

            const factorIds = metadata.metadata._supertokens?.defaultRequiredFactorIdsForUser?.[tenantId] ?? [];
            if (factorIds.includes(factorId)) {
                return;
            }

            factorIds.push(factorId);

            const metadataUpdate = {
                ...metadata.metadata,
                _supertokens: {
                    ...metadata.metadata._supertokens,
                    defaultRequiredFactorIdsForUser: {
                        ...metadata.metadata._supertokens?.factors,
                        [tenantId]: factorIds,
                    },
                },
            };

            await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
                userId: user.id,
                metadataUpdate,
                userContext,
            });
        },

        getDefaultRequiredFactorsForUser: async function ({ tenantId, user, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });

            return metadata.metadata._supertokens?.defaultRequiredFactorIdsForUser?.[tenantId] ?? [];
        },

        createPrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: RecipeUserId;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  user: User;
                  wasAlreadyAPrimaryUser: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/mfa/user/primary"), {
                recipeUserId: recipeUserId.getAsString(),
            });
            if (response.status === "OK") {
                response.user = new User(response.user);
            }
            return response;
        },

        linkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
            }: {
                recipeUserId: RecipeUserId;
                primaryUserId: string;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  accountsAlreadyLinked: boolean;
                  user: User;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  user: User;
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
              }
        > {
            const accountsLinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                }
            );

            if (
                ["OK", "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"].includes(
                    accountsLinkingResult.status
                )
            ) {
                accountsLinkingResult.user = new User(accountsLinkingResult.user);
            }

            // TODO check if the code below is required
            // if (accountsLinkingResult.status === "OK") {
            //     let user: UserType = accountsLinkingResult.user;
            //     if (!accountsLinkingResult.accountsAlreadyLinked) {
            //         await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
            //             user: user,
            //             recipeUserId,
            //             userContext,
            //         });

            //         const updatedUser = await this.getUser({
            //             userId: primaryUserId,
            //             userContext,
            //         });
            //         if (updatedUser === undefined) {
            //             throw Error("this error should never be thrown");
            //         }
            //         user = updatedUser;
            //         let loginMethodInfo = user.loginMethods.find(
            //             (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
            //         );
            //         if (loginMethodInfo === undefined) {
            //             throw Error("this error should never be thrown");
            //         }

            //         // await config.onAccountLinked(user, loginMethodInfo, userContext);
            //     }
            //     accountsLinkingResult.user = user;
            // }

            return accountsLinkingResult;
        },
    };
}
