import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import UserMetadataRecipe from "../usermetadata/recipe";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import RecipeUserId from "../../recipeUserId";
import { User } from "../../user";
import NormalisedURLPath from "../../normalisedURLPath";
import type MultiFactorAuthRecipe from "./recipe";
import { getUser } from "../..";
import Session from "../session";
import { TypeNormalisedInput } from "./types";

export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    recipeInstance: MultiFactorAuthRecipe
): RecipeInterface {
    return {
        getFactorsSetupForUser: async function ({ tenantId, user, userContext }) {
            return await recipeInstance.getFactorsSetupForUser(tenantId, user, userContext);
        },

        getAllAvailableFactorIds: async function () {
            return recipeInstance.getAllAvailableFactorIds();
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
                factorsSetUpForUser,
                userContext,
            }
        ) {
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                completedFactors,
                defaultRequiredFactorIdsForTenant,
                defaultRequiredFactorIdsForUser,
                factorsSetUpForUser,
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

        createOrUpdateSession: async function (
            this: RecipeInterface,
            { req, res, user, recipeUserId, tenantId, factorId, isValidFirstFactorForTenant, session, userContext }
        ) {
            if (session !== undefined) {
                const sessionUser = await getUser(session.getUserId(), userContext);
                if (sessionUser === undefined) {
                    throw new Error("User does not exist. Should never come here");
                }

                const factorsSetUpForUser = await this.getFactorsSetupForUser({
                    user: sessionUser,
                    tenantId: session.getTenantId(),
                    userContext,
                });
                if (!factorsSetUpForUser.includes(factorId)) {
                    // this factor was not setup for user, so need to check if it is allowed
                    const mfaClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
                    const completedFactors = mfaClaimValue?.c ?? {};
                    const defaultRequiredFactorIdsForUser: string[] = []; // TODO
                    const defaultRequiredFactorIdsForTenant: string[] = []; // TODO
                    const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                        session,
                        factorsSetUpForUser,
                        defaultRequiredFactorIdsForUser,
                        defaultRequiredFactorIdsForTenant: defaultRequiredFactorIdsForTenant,
                        completedFactors,
                        userContext,
                    });
                    const canSetup = await this.isAllowedToSetupFactor({
                        defaultRequiredFactorIdsForTenant,
                        defaultRequiredFactorIdsForUser,
                        factorsSetUpForUser: factorsSetUpForUser,
                        mfaRequirementsForAuth,
                        session,
                        factorId,
                        completedFactors,
                        userContext,
                    });
                    if (!canSetup) {
                        throw new Error("Cannot setup emailpassword factor for user");
                    }

                    // Account linking for MFA
                    if (!sessionUser.isPrimaryUser) {
                        await this.createPrimaryUser({ recipeUserId: new RecipeUserId(sessionUser.id), userContext });
                        // TODO check for response from above
                    }

                    await this.linkAccounts({
                        recipeUserId: new RecipeUserId(user.id),
                        primaryUserId: sessionUser.id,
                        userContext,
                    });
                    // TODO check for response from above

                    this.markFactorAsCompleteInSession({ session, factorId, userContext });
                }
            } else {
                if (
                    (isValidFirstFactorForTenant === undefined &&
                        config.firstFactors !== undefined &&
                        !config.firstFactors.includes(factorId)) ||
                    isValidFirstFactorForTenant === false
                ) {
                    throw new Error("Not a valid first factor: " + factorId);
                }

                session = await Session.createNewSession(req, res, tenantId, recipeUserId, {}, {}, userContext);
                this.markFactorAsCompleteInSession({ session, factorId, userContext });
            }
            return session;
        },
    };
}
