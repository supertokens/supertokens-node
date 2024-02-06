import AccountLinking from "./recipe/accountlinking/recipe";
import Session from "./recipe/session";
import MultiTenancy from "./recipe/multitenancy";
import MultiFactorAuth from "./recipe/multifactorauth";
import MultiFactorAuthRecipe from "./recipe/multifactorauth/recipe";
import { SessionContainerInterface } from "./recipe/session/types";
import { UserContext } from "./types";
import { LoginMethod, User } from "./user";
import RecipeUserId from "./recipeUserId";
import { isValidFirstFactor } from "./recipe/multifactorauth/utils";
import SessionError from "./recipe/session/error";
import { getUser } from ".";
import { AccountInfo, AccountInfoWithRecipeId } from "./recipe/accountlinking/types";
import { BaseRequest, BaseResponse } from "./framework";
import SessionRecipe from "./recipe/session/recipe";

export const AuthUtils = {
    getErrorStatusResponseWithReason<T = "SIGN_IN_UP_NOT_ALLOWED">(
        resp: { status: string },
        errorCodeMap: Record<string, string | undefined>,
        errorStatus: T
    ): { status: T; reason: string } {
        if (errorCodeMap[resp.status] !== undefined) {
            return {
                status: errorStatus,
                reason: errorCodeMap[resp.status]!,
            };
        }
        throw new Error("Should never come here: unmapped error status");
    },
    preAuthChecks: async function ({
        accountInfo,
        tenantId,
        isSignUp,
        isVerified,
        factorIds,
        session,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId;
        tenantId: string;
        factorIds: string[];
        isSignUp: boolean;
        isVerified: boolean;
        session?: SessionContainerInterface;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; validFactorIds: string[]; isFirstFactor: boolean }
        | { status: "SIGN_UP_NOT_ALLOWED" }
        | { status: "NON_PRIMARY_SESSION_USER" }
    > {
        const accountLinkingInstance = AccountLinking.getInstance();
        const mfaInstance = MultiFactorAuthRecipe.getInstance();
        let validFactorIds = [];

        // This would be an implementation error on our part, we only check it because TS doesn't
        if (factorIds.length === 0) {
            throw new Error("This should never happen: empty factorIds array passed to preSignInChecks");
        }

        // First we check if the app intends to link the user from the signin/up response or not,
        // to decide if this is an MFA or a first factor auth
        let wantToLinkSessionUser;
        let sessionUser = undefined;
        if (session === undefined) {
            // If there is no active session we have nothing to link to - so this has to be a first factor sign in
            wantToLinkSessionUser = false;
        } else {
            // We have to load the session user in order to get the account linking info
            sessionUser = await getUser(session.getUserId(), userContext);
            if (sessionUser === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }

            // We try and make the session user primary
            if (!sessionUser.isPrimaryUser) {
                // We could check here if the session user can even become a primary user, but that'd only mean one extra core call
                // without any added benefits, since the core already checks all pre-conditions
                if (await accountLinkingInstance.shouldBecomePrimaryUser(sessionUser, tenantId, session, userContext)) {
                    const makeSessionUserPrimaryRes = await accountLinkingInstance.recipeInterfaceImpl.createPrimaryUser(
                        { recipeUserId: sessionUser.loginMethods[0].recipeUserId, userContext }
                    );
                    if (
                        makeSessionUserPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                    ) {
                        // This means that the session user got primary since we loaded the session user info above
                        sessionUser = await getUser(makeSessionUserPrimaryRes.primaryUserId, userContext);

                        if (sessionUser === undefined) {
                            throw new SessionError({
                                type: SessionError.UNAUTHORISED,
                                message: "Session user not found",
                            });
                        }
                    } else if (makeSessionUserPrimaryRes.status === "OK") {
                        sessionUser = makeSessionUserPrimaryRes.user;
                    } else {
                        // All other statuses signify that we can't make the session user primary
                        // Which means we can't continue
                        return { status: "NON_PRIMARY_SESSION_USER" };
                    }
                } else {
                    // This means that the app doesn't want to make the session user primary
                    return { status: "NON_PRIMARY_SESSION_USER" };
                }
            }

            // We check if the app intends to link these two accounts
            // Note that this will be called even for already linked account info - user pairs and
            // in some cases if the accountInfo already belongs to a primary user
            const shouldLink = await accountLinkingInstance.config.shouldDoAutomaticAccountLinking(
                accountInfo,
                sessionUser,
                session,
                tenantId,
                userContext
            );

            wantToLinkSessionUser = shouldLink.shouldAutomaticallyLink;
        }

        // If the app will not link these accounts after auth, we consider this to be a first factor
        if (!wantToLinkSessionUser) {
            // We check if any factors here are valid first factors.
            // In all apis besides passwordless createCode, we know exactly which factor we are signing into, so in those cases,
            // this is basically just checking if the single factor is allowed or not.
            // For createCode, we filter whatever is allowed, if any of them are allowed, createCode can happen.
            // The filtered list can be used to select email templates. As an example:
            // If the flowType for passwordless is USER_INPUT_CODE_AND_MAGIC_LINK and firstFactors for the tenant we only have otp-email
            // then we do not want to include a link in the email.
            for (const id of factorIds) {
                // This util takes the tenant config into account (if it exists), then the MFA (static) config if it was initialized and set.
                let validRes = await isValidFirstFactor(tenantId, id, userContext);

                if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                    if (session !== undefined) {
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else {
                        throw new Error("Tenant not found");
                    }
                } else if (validRes.status === "OK") {
                    validFactorIds.push(id);
                }
            }

            if (validFactorIds.length === 0) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session is required for secondary factors",
                    payload: {
                        clearTokens: false,
                    },
                });
            }
        } else {
            // In this case the app will try to link the session user and the authenticating user after auth
            // so we consider this to be an MFA factor setup (if the MFA recipe is initialized)
            // and we check if factor setup is allowed accordingly
            let caughtSetupFactorError;
            if (mfaInstance !== undefined) {
                const factorsAlreadySetUp = await MultiFactorAuth.getFactorsSetupForUser(
                    session!.getUserId(userContext),
                    userContext
                );
                // In all apis besides passwordless createCode, we know exactly which factor we are signing into, so in those cases,
                // this is basically just checking if the single factor is allowed to be setup or not.
                // For createCode (if the FE didn't pass the factor id exactly, which it should for MFA),
                // we filter whatever is allowed. If any of them are allowed, createCode can happen.
                // The filtered list can be used to select email templates. As an example:
                // If the flowType for passwordless is USER_INPUT_CODE_AND_MAGIC_LINK and but only the otp-email factor is allowed to be set up
                // then we do not want to include a link in the email.
                for (const id of factorIds) {
                    try {
                        if (!factorsAlreadySetUp.includes(id)) {
                            await MultiFactorAuth.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                                session!,
                                id,
                                userContext
                            );
                        }
                        // we add it to the valid factor ids list since it is either already set up or allowed to be set up
                        validFactorIds.push(id);
                    } catch (err) {
                        caughtSetupFactorError = err;
                    }
                }
                if (validFactorIds.length === 0) {
                    throw caughtSetupFactorError;
                }
            }
        }
        // If this is a sign up we  check that the sign up is allowed
        // for sign ins, this is checked after the credentials have been verified
        if (isSignUp) {
            if (
                !(await accountLinkingInstance.isSignUpAllowed({
                    newUser: accountInfo,
                    isVerified,
                    tenantId,
                    session,
                    userContext,
                }))
            ) {
                return { status: "SIGN_UP_NOT_ALLOWED" };
            }
        }

        // If nothing failed, we return OK
        return { status: "OK", validFactorIds, isFirstFactor: !wantToLinkSessionUser };
    },

    postAuthChecks: async function ({
        responseUser,
        recipeUserId,
        isSignUp,
        factorId,
        session,
        req,
        res,
        tenantId,
        userContext,
    }: {
        responseUser: User;
        recipeUserId: RecipeUserId;
        tenantId: string;
        factorId: string;
        isSignUp: boolean;
        session?: SessionContainerInterface;
        userContext: UserContext;
        req: BaseRequest;
        res: BaseResponse;
    }): Promise<
        | { status: "OK"; session: SessionContainerInterface; user: User }
        | { status: "SIGN_IN_NOT_ALLOWED" }
        | { status: "LINKING_TO_SESSION_USER_FAILED" | "NON_PRIMARY_SESSION_USER" }
    > {
        const mfaInstance = MultiFactorAuthRecipe.getInstance();
        const accountLinkingInstance = AccountLinking.getInstance();

        // Then run linking if necessary/possible.
        // Note, that we are not re-using any information queried before the user signed in
        // This functions calls shouldDoAutomaticAccountLinking again (we check if the app wants to link to the session user or not),
        // which might return a different result. We could throw in this case, but it is an app code issue that that is fairly unlikely to go wrong.
        // It should not happen in general, but it is possible that we end up with an unlinked user after this even though originally we considered this
        // an MFA sign in.
        // There are a couple of race-conditions associated with this functions, but it handles retries internally.
        const linkingResult = await accountLinkingInstance.createPrimaryUserIdOrLinkByAccountInfo({
            tenantId,
            user: responseUser,
            recipeUserId,
            session,
            userContext,
        });

        if (linkingResult.status !== "OK") {
            return linkingResult;
        }

        // We check if sign in is allowed
        if (
            !isSignUp &&
            !(await accountLinkingInstance.isSignInAllowed({ user: responseUser, tenantId, session, userContext }))
        ) {
            return { status: "SIGN_IN_NOT_ALLOWED" };
        }

        let respSession = session;
        if (session !== undefined) {
            const postLinkUserLinkedToSessionUser = linkingResult.user.loginMethods.some(
                (lm) => lm.recipeUserId === session.getRecipeUserId()
            );
            if (postLinkUserLinkedToSessionUser && mfaInstance !== undefined) {
                // if the authenticating user is linked to the current user (it means that the factor got set up or completed),
                // we mark it as completed in the session.
                await MultiFactorAuth.markFactorAsCompleteInSession(respSession!, factorId, userContext);
            } else {
                // If the new user wasn't linked to the current one, we check the config and overwrite the session if required
                // Note: we could also get here if MFA is enabled, but the app didn't want to link the user to the session user.
                // This is intentional, since the MFA and overwriteSessionDuringSignInUp configs should work independently.
                let overwriteSessionDuringSignInUp = SessionRecipe.getInstanceOrThrowError().config
                    .overwriteSessionDuringSignInUp;
                if (overwriteSessionDuringSignInUp) {
                    respSession = await Session.createNewSession(req, res, tenantId, recipeUserId, {}, {}, userContext);
                    if (mfaInstance !== undefined) {
                        await MultiFactorAuth.markFactorAsCompleteInSession(respSession!, factorId, userContext);
                    }
                }
            }
        } else {
            // If there is no input session, we do not need to do anything other checks and create a new session
            respSession = await Session.createNewSession(req, res, tenantId, recipeUserId, {}, {}, userContext);

            // Here we can always mark the factor as completed, since we just created the session
            if (mfaInstance !== undefined) {
                await MultiFactorAuth.markFactorAsCompleteInSession(respSession!, factorId, userContext);
            }
        }
        return { status: "OK", session: respSession!, user: linkingResult.user };
    },

    getAuthenticatingUserAndAddToCurrentTenantIfRequired: async ({
        recipeId,
        accountInfo,
        tenantId: currentTenantId,
        checkCredentialsOnTenant,
        session,
        userContext,
    }: {
        recipeId: string;
        accountInfo: AccountInfo;
        tenantId: string;
        session: SessionContainerInterface | undefined;
        checkCredentialsOnTenant: (tenantId: string) => Promise<boolean>;
        userContext: UserContext;
    }): Promise<{ user: User; loginMethod: LoginMethod } | undefined> => {
        let i = 0;
        while (i++ < 300) {
            const existingUsers = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: currentTenantId,
                accountInfo,
                doUnionOfAccountInfo: false,
                userContext: userContext,
            });
            const usersWithMatchingLoginMethods = existingUsers
                .map((user) => ({
                    user,
                    loginMethod: user.loginMethods.find(
                        (lm) =>
                            lm.recipeId === recipeId &&
                            lm.hasSameEmailAs(accountInfo.email) &&
                            lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) &&
                            lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty)
                    )!,
                }))
                .filter(({ loginMethod }) => loginMethod !== undefined);
            if (usersWithMatchingLoginMethods.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }
            let authenticatingUser: { user: User; loginMethod: LoginMethod } = usersWithMatchingLoginMethods[0];

            if (authenticatingUser === undefined && session !== undefined) {
                const sessionUser = await getUser(session.getUserId(userContext), userContext);
                if (sessionUser === undefined) {
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }

                // Since the session user is undefined, we can't
                if (!sessionUser.isPrimaryUser) {
                    return undefined;
                }

                const matchingLoginMethods = sessionUser.loginMethods.filter(
                    (lm) =>
                        lm.recipeId === recipeId &&
                        lm.hasSameEmailAs(accountInfo.email) &&
                        lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) &&
                        lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty)
                );

                if (!matchingLoginMethods.some((lm) => lm.tenantIds.includes(currentTenantId))) {
                    let goToRetry = false;
                    for (const lm of matchingLoginMethods) {
                        if (await checkCredentialsOnTenant(lm.tenantIds[0])) {
                            const associateRes = await MultiTenancy.associateUserToTenant(
                                currentTenantId,
                                lm.recipeUserId,
                                userContext
                            );
                            if (associateRes.status === "OK") {
                                return { user: sessionUser, loginMethod: lm };
                            }
                            if (
                                associateRes.status === "UNKNOWN_USER_ID_ERROR" || // This means that the recipe user was deleted
                                // All below conditions mean that both the account list and the session user we loaded is outdated
                                associateRes.status === "EMAIL_ALREADY_EXISTS_ERROR" ||
                                associateRes.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR" ||
                                associateRes.status === "THIRD_PARTY_USER_ALREADY_EXISTS_ERROR"
                            ) {
                                // In these cases we retry, because we know some info we are using is outdated
                                // while some of these cases we could handle locally, it's cleaner to restart the process.
                                goToRetry = true;
                                break;
                            }
                            if (associateRes.status === "ASSOCIATION_NOT_ALLOWED_ERROR") {
                                // Since we were trying to share the recipe user linked to a primary user already associated with the tenant,
                                // this can only happen if the session user was disassociated from the tenant of the session,
                                // plus another user was created holding the account info we are trying to share with the tenant.
                                // Which basically means that the session is no longer valid.
                                throw new SessionError({
                                    type: SessionError.UNAUTHORISED,
                                    message: "Session user not associated with the session tenant",
                                });
                            }
                        }
                    }
                    if (goToRetry) {
                        continue;
                    }
                } else {
                    // This can happen in a race condition where a user was created and linked with the session user
                    // between listing the existing users and loading the session user
                    // We can continue, this doesn't cause any issues.
                    authenticatingUser = {
                        user: sessionUser,
                        loginMethod: matchingLoginMethods.find((lm) => lm.tenantIds.includes(currentTenantId))!,
                    };
                }
            }
            return authenticatingUser;
        }
        throw new Error(
            "This should never happen: ran out of retries for getAuthenticatingUserAndAddToCurrentTenantIfRequired"
        );
    },
};
