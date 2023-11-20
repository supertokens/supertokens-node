import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import UserMetadataRecipe from "../usermetadata/recipe";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import RecipeUserId from "../../recipeUserId";
import { User } from "../../user";
import NormalisedURLPath from "../../normalisedURLPath";
import type MultiFactorAuthRecipe from "./recipe";
import Session from "../session";
import { TypeNormalisedInput } from "./types";
import Multitenancy from "../multitenancy";

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

        checkAndCreateMFAContext: async function (
            this: RecipeInterface,
            { req, res, tenantId, factorIdInProgress, session, sessionUser, userAboutToSignIn, userContext }
        ) {
            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
            const validFirstFactors =
                tenantInfo?.firstFactors ||
                config.firstFactors ||
                (await this.getAllAvailableFactorIds({ userContext }));

            if (session === undefined) {
                // No session exists, so we need to check if it's a valid first factor before proceeding
                if (!validFirstFactors.includes(factorIdInProgress)) {
                    return {
                        status: "DISALLOWED_FIRST_FACTOR_ERROR",
                    };
                }
                return {
                    status: "OK",
                    req,
                    res,
                    tenantId,
                    factorIdInProgress,
                    session,
                    sessionUser,
                    userAboutToSignIn,
                };
            }

            if (userAboutToSignIn !== undefined) {
                // session exists and also an existing user is about to sign in
                // if the user about to sign in is not linked to the session user, we must check if it is a valid first factor
                // and this is because the active session will be replaced with a new session for the user that will sign in now
                if (!validFirstFactors.includes(factorIdInProgress)) {
                    return {
                        status: "DISALLOWED_FIRST_FACTOR_ERROR",
                    };
                }

                return {
                    status: "OK",
                    req,
                    res,
                    tenantId,
                    factorIdInProgress,
                    session,
                    sessionUser,
                    userAboutToSignIn,
                };
            }

            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const defaultRequiredFactorIdsForUser = await this.getDefaultRequiredFactorsForUser({
                user: sessionUser!,
                tenantId,
                userContext,
            });
            const factorsSetUpForUser = await this.getFactorsSetupForUser({
                user: sessionUser!,
                tenantId,
                userContext,
            });
            const completedFactorsClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser,
                defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
                defaultRequiredFactorIdsForUser,
                completedFactors: completedFactorsClaimValue?.c ?? {},
                userContext,
            });

            const canSetup = this.isAllowedToSetupFactor({
                session,
                factorId: factorIdInProgress,
                completedFactors: completedFactorsClaimValue?.c ?? {},
                defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
                defaultRequiredFactorIdsForUser,
                factorsSetUpForUser,
                mfaRequirementsForAuth,
                userContext,
            });
            if (!canSetup) {
                return {
                    status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
                };
            }

            return {
                status: "OK",
                req,
                res,
                tenantId,
                factorIdInProgress,
                session,
                sessionUser,
                userAboutToSignIn,
            };
        },

        createOrUpdateSession: async function (
            this: RecipeInterface,
            { justSignedInUser, justSignedInUserCreated, justSignedInRecipeUserId, mfaContext, userContext }
        ) {
            if (
                mfaContext.session === undefined || // no session exists, so we can create a new one
                (!justSignedInUserCreated && justSignedInUser.id !== mfaContext.sessionUser!.id) // the user that just logged in is not linked to the user in the session
            ) {
                const session = await Session.createNewSession(
                    mfaContext.req,
                    mfaContext.res,
                    mfaContext.tenantId,
                    justSignedInRecipeUserId,
                    {},
                    {},
                    userContext
                );
                this.markFactorAsCompleteInSession({ session, factorId: mfaContext.factorIdInProgress, userContext });
                return session;
            }

            if (mfaContext.sessionUser === undefined) {
                throw new Error("should never come here!");
            }

            if (justSignedInUserCreated) {
                // This is a newly created user, so it must be account linked with the session user
                if (!mfaContext.sessionUser.isPrimaryUser) {
                    await this.createPrimaryUser({
                        recipeUserId: new RecipeUserId(mfaContext.sessionUser.id),
                        userContext,
                    });
                    // TODO check for response from above
                }

                await this.linkAccounts({
                    recipeUserId: new RecipeUserId(justSignedInUser.id),
                    primaryUserId: mfaContext.sessionUser.id,
                    userContext,
                });
                // TODO check for response from above
            }

            this.markFactorAsCompleteInSession({
                session: mfaContext.session,
                factorId: mfaContext.factorIdInProgress,
                userContext,
            });

            return mfaContext.session;
        },
    };
}
