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
        getFactorsSetupForUser: async function ({ user, userContext }) {
            return await recipeInstance.getFactorsSetupForUser(user, userContext);
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
            /*
                We are removing only oldestFactor but not all factors considering the case below:
                Assume a user has emailpassword as first factor, and otp-phone & totp as secondary factors.

                once the the user logs in with emailpassword, that's added to the completedFactors array.
                Then user completes let's say otp-phone, that's added as well.

                Now when we try to build the next array, this function is called and we must return
                { oneOf: ['otp-phone', 'totp'] }, so that the auth is assumed complete for the default opt-in 2FA behaviour.

                If we remove all completed factors and return { oneOf: ['totp' ]} at this point, this will force the
                user to complete totp as well, which will result in a 3FA. which we don't intend to do by default.
            */
            allFactors.delete(oldestFactor!); // Removing the first factor if it exists

            return [{ oneOf: [...allFactors] }];
        },

        isAllowedToSetupFactor: async function (
            this: RecipeInterface,
            { factorId, session, factorsSetUpForUser, userContext }
        ) {
            const claimVal = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            if (!claimVal) {
                throw new Error("should never happen");
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
                userContext,
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
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/mfa/user/primary"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
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
                userContext,
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
                },
                userContext
            );

            if (
                ["OK", "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"].includes(
                    accountsLinkingResult.status
                )
            ) {
                accountsLinkingResult.user = new User(accountsLinkingResult.user);
            }

            if (accountsLinkingResult.status === "OK") {
                let user: User = accountsLinkingResult.user;
                if (!accountsLinkingResult.accountsAlreadyLinked) {
                    await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                        user: user,
                        recipeUserId,
                        userContext,
                    });

                    const updatedUser = await getUser(primaryUserId, userContext);
                    if (updatedUser === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    user = updatedUser;
                    let loginMethodInfo = user.loginMethods.find(
                        (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethodInfo === undefined) {
                        throw Error("this error should never be thrown");
                    }

                    // await config.onAccountLinked(user, loginMethodInfo, userContext);
                }
                accountsLinkingResult.user = user;
            }

            return accountsLinkingResult;
        },

        validateForMultifactorAuthBeforeFactorCompletion: async function (
            this: RecipeInterface,
            { tenantId, factorIdInProgress, session, userLoggingIn, isAlreadySetup, userContext }
        ) {
            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
            const validFirstFactors =
                tenantInfo?.firstFactors || config.firstFactors || recipeInstance.getAllAvailableFirstFactorIds();

            if (session === undefined) {
                // No session exists, so we need to check if it's a valid first factor before proceeding
                if (!validFirstFactors.includes(factorIdInProgress)) {
                    return {
                        status: "DISALLOWED_FIRST_FACTOR_ERROR",
                    };
                }
                return {
                    status: "OK",
                };
            }

            let sessionUser;
            if (userLoggingIn) {
                if (userLoggingIn.id !== session.getUserId()) {
                    // the user trying to login is not linked to the session user, based on session behaviour
                    // we just return OK and do nothing or replace replace the existing session with a new one
                    // we are doing this because we allow factor setup only when creating a new user

                    // this can happen when you got into login screen with an existing session and tried to log in with a different credentials
                    // or a case while doing secondary factor for phone otp but the user created a different account with the same phone number
                    return {
                        status: "OK",
                    };
                }
                sessionUser = userLoggingIn;
            } else {
                sessionUser = await getUser(session.getUserId(), userContext);
            }

            if (!sessionUser) {
                // Session user doesn't exist, maybe the user was deleted
                // Race condition, user got deleted in parallel, throw unauthorized
                return {
                    status: "SESSION_USER_NOT_FOUND_ERROR",
                    message: "User for this session was not found. Please contact support. (ERR_CODE_010)",
                };
            }

            if (isAlreadySetup) {
                return {
                    status: "OK",
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
            };
        },

        createOrUpdateSessionForMultifactorAuthAfterFactorCompletion: async function (
            this: RecipeInterface,
            { req, res, tenantId, factorIdInProgress, justCompletedFactorUserInfo, userContext }
        ) {
            let session = await Session.getSession(req, res, { sessionRequired: false });
            if (
                session === undefined // no session exists, so we can create a new one
            ) {
                if (justCompletedFactorUserInfo === undefined) {
                    throw new Error("should never come here"); // We wouldn't create new session from a recipe like TOTP
                }

                const newSession = await Session.createNewSession(
                    req,
                    res,
                    tenantId,
                    justCompletedFactorUserInfo.recipeUserId,
                    {},
                    {},
                    false,
                    userContext
                );
                await this.markFactorAsCompleteInSession({
                    session: newSession,
                    factorId: factorIdInProgress,
                    userContext,
                });
                return {
                    status: "OK",
                    session: newSession,
                };
            }

            const sessionUser = await getUser(session.getUserId(), userContext);

            // race condition, user deleted throw unauthorized
            if (sessionUser === undefined) {
                return {
                    status: "SESSION_USER_NOT_FOUND_ERROR",
                    message: "User for this session was not found. Please contact support. (ERR_CODE_010)",
                };
            }

            if (justCompletedFactorUserInfo !== undefined) {
                if (justCompletedFactorUserInfo.createdNewUser) {
                    // This is a newly created user, so it must be account linked with the session user
                    if (!sessionUser.isPrimaryUser) {
                        const createPrimaryRes = await this.createPrimaryUser({
                            recipeUserId: new RecipeUserId(sessionUser.id),
                            userContext,
                        });
                        if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                            // Race condition
                            // TODO MFA Recursion from the line where we fetch the sessionUser
                            throw new Error("should never happen"); // new user, that's why
                        } else if (
                            createPrimaryRes.status ===
                            "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        ) {
                            return {
                                status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                message: "Error setting up MFA for the user. Please contact support. (ERR_CODE_011)",
                            };
                        }
                    }

                    const linkRes = await this.linkAccounts({
                        recipeUserId: justCompletedFactorUserInfo.recipeUserId,
                        primaryUserId: sessionUser.id,
                        userContext,
                    });

                    if (linkRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                        // TODO MFA contact support
                        throw new Error("should never happen"); // new user shouldn't have this issue
                    } else if (linkRes.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                        // TODO MFA recurse from fetch SessionUser
                        throw new Error("should never happen");
                    } else if (
                        linkRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        return {
                            status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                            message:
                                "Cannot complete factor setup as the account info is already associated with another primary user. Please contact support. (ERR_CODE_012)",
                        };
                    }
                } else {
                    // Not a new user we should check if the user is linked to the session user
                    const loggedInUserLinkedToSessionUser = sessionUser.id === justCompletedFactorUserInfo.user.id;
                    if (!loggedInUserLinkedToSessionUser) {
                        // we may keep or replace the session as per the flag overwriteSessionDuringSignIn in session recipe
                        session = await Session.createNewSession(
                            req,
                            res,
                            tenantId,
                            justCompletedFactorUserInfo.recipeUserId,
                            {},
                            {},
                            false,
                            userContext
                        );

                        return {
                            status: "OK",
                            session: session,
                        };
                    }
                }
            }

            await this.markFactorAsCompleteInSession({
                session: session,
                factorId: factorIdInProgress,
                userContext,
            });

            return {
                status: "OK",
                session: session,
            };
        },
    };
}
