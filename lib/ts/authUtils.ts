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
import { logDebugMessage } from "./logger";
import { EmailVerificationClaim } from "./recipe/emailverification";

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
        logDebugMessage(`unmapped error status ${resp.status}`);
        throw new Error("Should never come here: unmapped error status");
    },
    preAuthChecks: async function ({
        accountInfo,
        tenantId,
        isSignUp,
        isVerified,
        inputUser,
        factorIds,
        session,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId;
        inputUser: User | undefined;
        tenantId: string;
        factorIds: string[];
        isSignUp: boolean;
        isVerified: boolean;
        session?: SessionContainerInterface;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; validFactorIds: string[] }
        | { status: "SIGN_UP_NOT_ALLOWED" }
        | {
              status:
                  | "LINKING_TO_SESSION_USER_FAILED"
                  | "NON_PRIMARY_SESSION_USER_OTHER_PRIMARY_USER"
                  | "NOT_LINKING_NON_FIRST_FACTOR";
          }
    > {
        let validFactorIds: string[];

        // This would be an implementation error on our part, we only check it because TS doesn't
        if (factorIds.length === 0) {
            throw new Error("This should never happen: empty factorIds array passed to preSignInChecks");
        }

        logDebugMessage("preAuthChecks checking auth types");
        // First we check if the app intends to link the user from the signin/up response or not,
        // to decide if this is a first factor auth or not and if it'll link to the session user
        // We also load the session user here if it is available.
        const authTypeInfo = await checkAuthType(session, accountInfo, inputUser, tenantId, userContext);
        if (authTypeInfo.status !== "OK") {
            logDebugMessage(`preAuthChecks returning ${authTypeInfo.status} from checkAuthType results`);
            return authTypeInfo;
        }

        // If the app will not link these accounts after auth, we consider this to be a first factor auth
        if (authTypeInfo.isFirstFactor) {
            logDebugMessage("preAuthChecks getting valid first factors");
            // We check if any factors here are valid first factors.
            // In all apis besides passwordless createCode, we know exactly which factor we are signing into, so in those cases,
            // this is basically just checking if the single factor is allowed or not.
            // For createCode, we filter whatever is allowed, if any of them are allowed, createCode can happen.
            // The filtered list can be used to select email templates. As an example:
            // If the flowType for passwordless is USER_INPUT_CODE_AND_MAGIC_LINK and firstFactors for the tenant we only have otp-email
            // then we do not want to include a link in the email.
            const validFirstFactorsRes = await getValidFirstFactors(
                factorIds,
                tenantId,
                session !== undefined,
                userContext
            );
            if (validFirstFactorsRes.status === "OK") {
                validFactorIds = validFirstFactorsRes.validFactorIds;
            } else {
                logDebugMessage("preAuthChecks error: NO_VALID_FIRST_FACTOR");
                return validFirstFactorsRes;
            }
        } else {
            logDebugMessage("preAuthChecks getting valid secondary factors");
            // In this case the app will try to link the session user and the authenticating user after auth,
            // so we need to check if this is allowed by the MFA recipe (if initialized).
            validFactorIds = await getValidSecondaryFactors(
                accountInfo,
                factorIds,
                authTypeInfo.createsNewLinkForTheSessionUser,
                authTypeInfo.sessionUser,
                session!,
                userContext
            );
        }
        // If this is a sign up we  check that the sign up is allowed
        // for sign ins, this is checked after the credentials have been verified
        if (isSignUp) {
            logDebugMessage("preAuthChecks checking if the user is allowed to sign up");
            if (
                !(await AccountLinking.getInstance().isSignUpAllowed({
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

        logDebugMessage("preAuthChecks returning OK");
        // If nothing failed, we return OK
        return {
            status: "OK",
            validFactorIds,
        };
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
        | {
              status: "LINKING_TO_SESSION_USER_FAILED" | "NON_PRIMARY_SESSION_USER_OTHER_PRIMARY_USER";
          }
    > {
        logDebugMessage(
            `postAuthChecks called ${session !== undefined ? "with" : "without"} a session to ${
                isSignUp ? "sign in" : "sign up"
            } with ${factorId}`
        );

        const mfaInstance = MultiFactorAuthRecipe.getInstance();
        const accountLinkingInstance = AccountLinking.getInstance();

        // Then run linking if necessary/possible.
        // Note, that we are not re-using any information queried before the user signed in
        // This functions calls shouldDoAutomaticAccountLinking again (we check if the app wants to link to the session user or not),
        // which might return a different result. We could throw in this case, but it is an app code issue that that is fairly unlikely to go wrong.
        // It should not happen in general, but it is possible that we end up with an unlinked user after this even though originally we considered this
        // an MFA sign in.
        // There are a couple of race-conditions associated with this functions, but it handles retries internally.
        const linkingResult = await accountLinkingInstance.createPrimaryUserIdOrLinkByAccountInfoOrLinkToSessionIfProvided(
            {
                tenantId,
                user: responseUser,
                recipeUserId,
                session,
                userContext,
            }
        );

        if (linkingResult.status !== "OK") {
            logDebugMessage(`postAuthChecks returning early because createPrimaryUserIdOrLinkByAccountInfo failed`);
            return linkingResult;
        }

        // We check if sign in is allowed
        if (
            !isSignUp &&
            !(await accountLinkingInstance.isSignInAllowed({ user: responseUser, tenantId, session, userContext }))
        ) {
            logDebugMessage(`postAuthChecks returning SIGN_IN_NOT_ALLOWED`);
            return { status: "SIGN_IN_NOT_ALLOWED" };
        }

        let respSession = session;
        if (session !== undefined) {
            const postLinkUserLinkedToSessionUser = linkingResult.user.loginMethods.some(
                (lm) => lm.recipeUserId === session.getRecipeUserId()
            );
            if (postLinkUserLinkedToSessionUser) {
                logDebugMessage(`postAuthChecks session and input user got linked`);
                if (mfaInstance !== undefined) {
                    logDebugMessage(`postAuthChecks marking factor as completed`);
                    // if the authenticating user is linked to the current session user (it means that the factor got set up or completed),
                    // we mark it as completed in the session.
                    await MultiFactorAuth.markFactorAsCompleteInSession(respSession!, factorId, userContext);
                }
            } else {
                logDebugMessage(`postAuthChecks checking overwriteSessionDuringSignInUp`);
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
            logDebugMessage(`postAuthChecks creating session for first factor sign in/up`);
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
            logDebugMessage(
                `getAuthenticatingUserAndAddToCurrentTenantIfRequired called with ${JSON.stringify(accountInfo)}`
            );
            const existingUsers = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: currentTenantId,
                accountInfo,
                doUnionOfAccountInfo: true,
                userContext: userContext,
            });
            logDebugMessage(
                `getAuthenticatingUserAndAddToCurrentTenantIfRequired got ${existingUsers.length} users from the core resp`
            );
            const usersWithMatchingLoginMethods = existingUsers
                .map((user) => ({
                    user,
                    loginMethod: user.loginMethods.find(
                        (lm) =>
                            lm.recipeId === recipeId &&
                            (lm.hasSameEmailAs(accountInfo.email) ||
                                lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) ||
                                lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty))
                    )!,
                }))
                .filter(({ loginMethod }) => loginMethod !== undefined);
            logDebugMessage(
                `getAuthenticatingUserAndAddToCurrentTenantIfRequired got ${usersWithMatchingLoginMethods.length} users with matching login methods`
            );
            if (usersWithMatchingLoginMethods.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }
            let authenticatingUser: { user: User; loginMethod: LoginMethod } = usersWithMatchingLoginMethods[0];

            if (authenticatingUser === undefined && session !== undefined) {
                logDebugMessage(`getAuthenticatingUserAndAddToCurrentTenantIfRequired checking session user`);
                const sessionUser = await getUser(session.getUserId(userContext), userContext);
                if (sessionUser === undefined) {
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }

                // Since the session user is undefined, we can't
                if (!sessionUser.isPrimaryUser) {
                    logDebugMessage(
                        `getAuthenticatingUserAndAddToCurrentTenantIfRequired session user is non-primary so returning early without checking other tenants`
                    );
                    return undefined;
                }

                const matchingLoginMethods = sessionUser.loginMethods.filter(
                    (lm) =>
                        lm.recipeId === recipeId &&
                        (lm.hasSameEmailAs(accountInfo.email) ||
                            lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) ||
                            lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty))
                );
                logDebugMessage(
                    `getAuthenticatingUserAndAddToCurrentTenantIfRequired session has ${matchingLoginMethods.length} matching login methods`
                );

                if (matchingLoginMethods.some((lm) => lm.tenantIds.includes(currentTenantId))) {
                    logDebugMessage(
                        `getAuthenticatingUserAndAddToCurrentTenantIfRequired session has ${matchingLoginMethods.length} matching login methods`
                    );
                    // This can happen in a race condition where a user was created and linked with the session user
                    // between listing the existing users and loading the session user
                    // We can continue, this doesn't cause any issues.
                    authenticatingUser = {
                        user: sessionUser,
                        loginMethod: matchingLoginMethods.find((lm) => lm.tenantIds.includes(currentTenantId))!,
                    };
                }
                let goToRetry = false;
                for (const lm of matchingLoginMethods) {
                    logDebugMessage(
                        `getAuthenticatingUserAndAddToCurrentTenantIfRequired session checking credentials on ${lm.tenantIds[0]}`
                    );
                    if (await checkCredentialsOnTenant(lm.tenantIds[0])) {
                        logDebugMessage(
                            `getAuthenticatingUserAndAddToCurrentTenantIfRequired associating user from ${lm.tenantIds[0]} with current tenant`
                        );
                        const associateRes = await MultiTenancy.associateUserToTenant(
                            currentTenantId,
                            lm.recipeUserId,
                            userContext
                        );
                        logDebugMessage(
                            `getAuthenticatingUserAndAddToCurrentTenantIfRequired associating returned ${associateRes.status}`
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
                    logDebugMessage(`getAuthenticatingUserAndAddToCurrentTenantIfRequired retrying`);
                    continue;
                }
            }
            return authenticatingUser;
        }
        throw new Error(
            "This should never happen: ran out of retries for getAuthenticatingUserAndAddToCurrentTenantIfRequired"
        );
    },
};

async function getValidSecondaryFactors(
    accountInfo: AccountInfo,
    factorIds: string[],
    createsNewLinkForTheSessionUser: boolean,
    sessionUser: User,
    session: SessionContainerInterface,
    userContext: UserContext
) {
    if (session === undefined) {
        throw new Error("This should never happen: getValidSecondaryFactors called without a session");
    }
    if (sessionUser === undefined) {
        throw new Error("This should never happen: getValidSecondaryFactors called without a sessionUser");
    }
    logDebugMessage(`getValidSecondaryFactors called for ${factorIds.join(", ")}`);

    const mfaInstance = MultiFactorAuthRecipe.getInstance();
    if (mfaInstance !== undefined) {
        if (createsNewLinkForTheSessionUser) {
            // If we are linking the input user to the session user, then we need to check if MFA allows it
            // Note that this is mostly but not exactly the same as a factor setup:
            // we consider passwordless factors as already set up if the session user has a login method connected to them
            logDebugMessage(`getValidSecondaryFactors checking if linking is allowed by the mfa recipe`);
            return mfaInstance.checkIfLinkingAllowed(session, sessionUser, factorIds, accountInfo, userContext);
        } else {
            // If signing in will not change the user (no linking), then we can let the sign-in/up happen (if allowed by account linking checks)
            logDebugMessage(`getValidSecondaryFactors allowing all factors because it'll not create new link`);
            return factorIds;
        }
    } else {
        logDebugMessage(`getValidSecondaryFactors allowing all factors because MFA is not enabled`);
        // If MFA is not enabled, we allow the user to connect any secondary account to the session user.
        return factorIds;
    }
}

async function getValidFirstFactors(
    factorIds: string[],
    tenantId: string,
    hasSession: boolean,
    userContext: UserContext
): Promise<{ status: "OK"; validFactorIds: string[] } | { status: "NOT_LINKING_NON_FIRST_FACTOR" }> {
    let validFactorIds = [];
    for (const id of factorIds) {
        // This util takes the tenant config into account (if it exists), then the MFA (static) config if it was initialized and set.
        let validRes = await isValidFirstFactor(tenantId, id, userContext);

        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
            if (hasSession !== undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Tenant not found",
                });
            } else {
                throw new Error("Tenant not found error.");
            }
        } else if (validRes.status === "OK") {
            validFactorIds.push(id);
        }
    }

    if (validFactorIds.length === 0) {
        if (hasSession === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "A valid session is required to authenticate with secondary factors",
            });
        } else {
            return { status: "NOT_LINKING_NON_FIRST_FACTOR" }; // TODO: better name?
        }
    }
    return { status: "OK", validFactorIds };
}

async function getPrimarySessionUser(
    session: SessionContainerInterface,
    tenantId: string,
    userContext: UserContext
): Promise<
    | { status: "OK"; sessionUser: User }
    | { status: "NON_PRIMARY_SESSION_USER_OTHER_PRIMARY_USER" | "NON_PRIMARY_SESSION_USER_NO_LINK" }
> {
    logDebugMessage(`getPrimarySessionUser called`);
    const accountLinkingInstance = AccountLinking.getInstance();
    let sessionUser = await getUser(session.getUserId(), userContext);
    if (sessionUser === undefined) {
        throw new SessionError({
            type: SessionError.UNAUTHORISED,
            message: "Session user not found",
        });
    }

    // We try and make the session user primary
    if (!sessionUser.isPrimaryUser) {
        logDebugMessage(`getPrimarySessionUser not session user yet`);
        // We could check here if the session user can even become a primary user, but that'd only mean one extra core call
        // without any added benefits, since the core already checks all pre-conditions

        // We do this check here instead of using the shouldBecomePrimaryUser util, because
        // here we handle the shouldRequireVerification case differently
        const shouldDoAccountLinking = await accountLinkingInstance.config.shouldDoAutomaticAccountLinking(
            sessionUser.loginMethods[0],
            undefined,
            session,
            tenantId,
            userContext
        );
        logDebugMessage(`getPrimarySessionUser shouldDoAccountLinking: ${JSON.stringify(shouldDoAccountLinking)}`);

        if (shouldDoAccountLinking.shouldAutomaticallyLink) {
            if (shouldDoAccountLinking.shouldRequireVerification && !sessionUser.loginMethods[0].verified) {
                // We force-update the claim value if it is not set or different from what we just fetched from the DB
                if ((await session.getClaimValue(EmailVerificationClaim, userContext)) !== false) {
                    logDebugMessage(`getPrimarySessionUser updating emailverification status in session`);
                    // This will let the frontend know if the value has been updated in the background
                    await session.setClaimValue(EmailVerificationClaim, false, userContext);
                }
                logDebugMessage(`getPrimarySessionUser throwing validation error`);
                // Then run the validation expecting it to fail. We run assertClaims instead of throwing the error locally
                // to make sure the error shape in the response will match what we'd return normally
                await session.assertClaims([EmailVerificationClaim.validators.isVerified()], userContext);
                throw new Error(
                    "This should never happen: email verification claim validator passed after setting value to false"
                );
            }
            const makeSessionUserPrimaryRes = await accountLinkingInstance.recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                userContext,
            });
            logDebugMessage(
                `getPrimarySessionUser makeSessionUserPrimaryRes returned ${makeSessionUserPrimaryRes.status}`
            );
            if (makeSessionUserPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
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
                return { status: "NON_PRIMARY_SESSION_USER_OTHER_PRIMARY_USER" };
            }
        } else {
            // This means that the app doesn't want to make the session user primary
            return { status: "NON_PRIMARY_SESSION_USER_NO_LINK" };
        }
    }
    return { status: "OK", sessionUser };
}

async function checkAuthType( // TODO: better name
    session: SessionContainerInterface | undefined,
    accountInfo: AccountInfoWithRecipeId,
    inputUser: User | undefined,
    tenantId: string,
    userContext: UserContext
): Promise<
    | { status: "OK"; isFirstFactor: true }
    | { status: "OK"; isFirstFactor: false; createsNewLinkForTheSessionUser: boolean; sessionUser: User }
    | { status: "NON_PRIMARY_SESSION_USER_OTHER_PRIMARY_USER" }
> {
    logDebugMessage(`checkAuthType called`);
    let sessionUser: User | undefined = undefined;
    if (session === undefined) {
        logDebugMessage(`checkAuthType returning first factor`);
        // If there is no active session we have nothing to link to - so this has to be a first factor sign in
        return { status: "OK", isFirstFactor: true };
    } else {
        // If the input and the session user are the same
        if (inputUser !== undefined && inputUser.id === session.getUserId()) {
            logDebugMessage(`checkAuthType returning secondary factor, session and input user are the same`);
            // Then this is basically a user logging in with an already linked secondary account
            // Which is basically a factor completion in MFA terms.
            // Since the sessionUser and the inputUser are the same in this case, we can just return early
            return {
                status: "OK",
                isFirstFactor: false,
                createsNewLinkForTheSessionUser: false,
                sessionUser: inputUser,
            };
        }
        logDebugMessage(`checkAuthType loading session user`);
        // We have to load the session user in order to get the account linking info
        const sessionUserResult = await getPrimarySessionUser(session, tenantId, userContext);
        if (sessionUserResult.status !== "OK") {
            return {
                status: "OK",
                isFirstFactor: true,
            };
        }
        sessionUser = sessionUserResult.sessionUser;

        // We check if the app intends to link these two accounts
        // Note: in some cases if the accountInfo already belongs to a primary user
        const shouldLink = await AccountLinking.getInstance().config.shouldDoAutomaticAccountLinking(
            accountInfo,
            sessionUser,
            session,
            tenantId,
            userContext
        );
        logDebugMessage(
            `checkAuthType session user <-> input user shouldDoAutomaticAccountLinking returned ${JSON.stringify(
                shouldLink
            )}`
        );

        if (shouldLink.shouldAutomaticallyLink === false) {
            return { status: "OK", isFirstFactor: true };
        } else {
            return { status: "OK", isFirstFactor: false, createsNewLinkForTheSessionUser: true, sessionUser };
        }
    }
}
