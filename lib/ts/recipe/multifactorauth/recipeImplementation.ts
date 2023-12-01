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
import { getUser } from "../..";
import { logDebugMessage } from "../../logger";

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
            completedFactors,
        }) {
            const loginTime = Math.min(...Object.values(completedFactors));
            const oldestFactor = Object.keys(completedFactors).find((k) => completedFactors[k] === loginTime);
            const allFactors: Set<string> = new Set();
            for (const factor of defaultRequiredFactorIdsForUser) {
                allFactors.add(factor);
            }
            for (const factor of defaultRequiredFactorIdsForTenant) {
                allFactors.add(factor);
            }
            // TODO MFA: validate this
            allFactors.delete(oldestFactor!);

            return [{ oneOf: [...allFactors] }];
        },

        isAllowedToSetupFactor: async function (
            this: RecipeInterface,
            { factorId, session, factorsSetUpForUser, userContext }
        ) {
            const claimVal = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            if (!claimVal) {
                logDebugMessage(`isAllowedToSetupFactor ${factorId}: false because claim value is undefined`);
                // This should not happen in normal use.
                return false;
            }

            // // This solution: checks for 2FA (we'd allow factor setup if the user has set up only 1 factor group or completed at least 2)
            // const factorGroups = [
            //     ["otp-phone", "link-phone"],
            //     ["otp-email", "link-email"],
            //     ["emailpassword"],
            //     ["thirdparty"],
            // ];
            // const setUpGroups = Array.from(
            //     new Set(factorsSetUpForUser.map((id) => factorGroups.find((f) => f.includes(id)) || [id]))
            // );

            // const completedGroups = setUpGroups.filter((group) => group.some((id) => claimVal.c[id] !== undefined));

            // // If the user completed every factor they could
            // if (setUpGroups.length === completedGroups.length) {
            //     logDebugMessage(
            //         `isAllowedToSetupFactor ${factorId}: true because the user completed all factors they have set up and this is required`
            //     );
            //     return true;
            // }

            // return completedGroups.length >= 2;

            if (claimVal.n.some((id) => factorsSetUpForUser.includes(id))) {
                logDebugMessage(
                    `isAllowedToSetupFactor ${factorId}: false because there are items already set up in the next array: ${claimVal.n.join(
                        ", "
                    )}`
                );
                return false;
            }
            logDebugMessage(
                `isAllowedToSetupFactor ${factorId}: true because the next array is ${
                    claimVal.n.length === 0 ? "empty" : "cannot be completed otherwise"
                }`
            );
            return true;
        },

        markFactorAsCompleteInSession: async function (this: RecipeInterface, { session, factorId, userContext }) {
            const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
            const completed = {
                ...currentValue?.c,
                [factorId]: Math.floor(Date.now() / 1000),
            };
            const tenantId = session.getTenantId();
            const user = await getUser(session.getUserId(), userContext);
            if (user === undefined) {
                throw new Error("User not found!");
            }

            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
            const defaultRequiredFactorIdsForUser = await this.getDefaultRequiredFactorsForUser({
                user: user!,
                tenantId,
                userContext,
            });
            const factorsSetUpForUser = await this.getFactorsSetupForUser({
                user: user!,
                tenantId,
                userContext,
            });
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser,
                defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
                defaultRequiredFactorIdsForUser,
                completedFactors: completed,
                userContext,
            });
            const next = MultiFactorAuthClaim.buildNextArray(completed, mfaRequirementsForAuth);
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

            // TODO MFA check if the code below is required
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
            { req, res, tenantId, factorIdInProgress, session, userLoggingIn, isAlreadySetup, userContext }
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
                    sessionUser: userLoggingIn,
                    isAlreadySetup,
                };
            }

            let sessionUser;
            if (userLoggingIn) {
                if (userLoggingIn.id !== session.getUserId()) {
                    return {
                        status: "FACTOR_SETUP_NOT_ALLOWED_ERROR", // TODO MFA
                    };
                }
                sessionUser = userLoggingIn;
            } else {
                sessionUser = await getUser(session.getUserId(), userContext);
            }

            if (!sessionUser) {
                throw new Error("Session user deleted"); // TODO MFA
            }

            if (isAlreadySetup) {
                return {
                    status: "OK",
                    req,
                    res,
                    tenantId,
                    factorIdInProgress,
                    session,
                    sessionUser,
                    isAlreadySetup,
                };
            }

            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const defaultRequiredFactorIdsForUser = await this.getDefaultRequiredFactorsForUser({
                user: sessionUser,
                tenantId,
                userContext,
            });
            const factorsSetUpForUser = await this.getFactorsSetupForUser({
                user: sessionUser,
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

            const canSetup = await this.isAllowedToSetupFactor({
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
                isAlreadySetup,
            };
        },

        createOrUpdateSession: async function (
            this: RecipeInterface,
            { justSignedInUser, justSignedInUserCreated, justSignedInRecipeUserId, mfaContext, userContext }
        ) {
            if (
                mfaContext.session === undefined // no session exists, so we can create a new one
            ) {
                const session = await Session.createNewSession(
                    mfaContext.req,
                    mfaContext.res,
                    mfaContext.tenantId,
                    justSignedInRecipeUserId,
                    {},
                    {},
                    false,
                    userContext
                );
                await this.markFactorAsCompleteInSession({
                    session,
                    factorId: mfaContext.factorIdInProgress,
                    userContext,
                });
                return session;
            } else if (!justSignedInUserCreated && justSignedInUser.id !== mfaContext.sessionUser?.id) {
                throw new Error("should never come here!");
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
                    // TODO MFA check for response from above
                }

                const linkRes = await this.linkAccounts({
                    recipeUserId: justSignedInRecipeUserId,
                    primaryUserId: mfaContext.sessionUser.id,
                    userContext,
                });
                if (linkRes.status !== "OK") {
                    throw new Error("Throw proper errors!" + linkRes.status); // TODO MFA
                }
            } else {
                const loggedInUserLinkedToSessionUser = mfaContext.sessionUser.loginMethods.some(
                    (v) => v.recipeUserId.getAsString() === justSignedInRecipeUserId.getAsString()
                );
                if (!loggedInUserLinkedToSessionUser) {
                    throw new Error("Throw proper errors! Not linked"); // TODO MFA
                }
            }

            await this.markFactorAsCompleteInSession({
                session: mfaContext.session,
                factorId: mfaContext.factorIdInProgress,
                userContext,
            });
            await this.addToDefaultRequiredFactorsForUser({
                user: mfaContext.sessionUser,
                tenantId: mfaContext.tenantId,
                factorId: mfaContext.factorIdInProgress,
                userContext,
            });

            return mfaContext.session;
        },
    };
}
