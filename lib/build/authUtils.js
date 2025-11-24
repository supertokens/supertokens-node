"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
const recipe_1 = __importDefault(require("./recipe/accountlinking/recipe"));
const session_1 = __importDefault(require("./recipe/session"));
const multitenancy_1 = __importDefault(require("./recipe/multitenancy"));
const multifactorauth_1 = __importDefault(require("./recipe/multifactorauth"));
const recipe_2 = __importDefault(require("./recipe/multifactorauth/recipe"));
const utils_1 = require("./recipe/multifactorauth/utils");
const utils_2 = require("./recipe/multitenancy/utils");
const error_1 = __importDefault(require("./recipe/session/error"));
const _1 = require(".");
const logger_1 = require("./logger");
const emailverification_1 = require("./recipe/emailverification");
const error_2 = __importDefault(require("./error"));
const utils_3 = require("./recipe/accountlinking/utils");
exports.AuthUtils = {
    /**
     * This helper function can be used to map error statuses (w/ an optional reason) to error responses with human readable reasons.
     * This maps to a response in the format of `{ status: "3rd param", reason: "human readable string from second param" }`
     *
     * The errorCodeMap is expected to be something like:
     * ```
     * {
     *      EMAIL_VERIFICATION_REQUIRED: "This is returned as reason if the resp(1st param) has the status code EMAIL_VERIFICATION_REQUIRED and an undefined reason",
     *      STATUS: {
     *          REASON: "This is returned as reason if the resp(1st param) has STATUS in the status prop and REASON in the reason prop"
     *      }
     * }
     * ```
     */
    getErrorStatusResponseWithReason(resp, errorCodeMap, errorStatus) {
        const reasons = errorCodeMap[resp.status];
        if (reasons !== undefined) {
            if (typeof reasons === "string") {
                return {
                    status: errorStatus,
                    reason: reasons,
                };
            } else if (typeof reasons === "object" && resp.reason !== undefined) {
                if (reasons[resp.reason]) {
                    return {
                        status: errorStatus,
                        reason: reasons[resp.reason],
                    };
                }
            }
        }
        (0, logger_1.logDebugMessage)(`unmapped error status ${resp.status} (${resp.reason})`);
        throw new Error("Should never come here: unmapped error status " + resp.status);
    },
    /**
     * Runs all checks we need to do before trying to authenticate a user:
     * - if this is a first factor auth or not
     * - if the session user is required to be primary (and tries to make it primary if necessary)
     * - if any of the factorids are valid (as first or secondary factors), taking into account mfa factor setup rules
     * - if sign up is allowed (if isSignUp === true)
     *
     * It returns the following statuses:
     * - OK: the auth flow can proceed
     * - SIGN_UP_NOT_ALLOWED: if isSignUpAllowed returned false. This is mostly because of conflicting users with the same account info
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should become primary but we couldn't make it primary because of a conflicting primary user.
     */
    preAuthChecks: async function ({
        authenticatingAccountInfo,
        tenantId,
        isSignUp,
        isVerified,
        signInVerifiesLoginMethod,
        authenticatingUser,
        factorIds,
        skipSessionUserUpdateInCore,
        session,
        shouldTryLinkingWithSessionUser,
        userContext,
    }) {
        let validFactorIds;
        // This would be an implementation error on our part, we only check it because TS doesn't
        if (factorIds.length === 0) {
            throw new Error("This should never happen: empty factorIds array passed to preSignInChecks");
        }
        (0, logger_1.logDebugMessage)("preAuthChecks checking auth types");
        // First we check if the app intends to link the inputUser or not,
        // to decide if this is a first factor auth or not and if it'll link to the session user
        // We also load the session user here if it is available.
        const authTypeInfo = await exports.AuthUtils.checkAuthTypeAndLinkingStatus(
            session,
            shouldTryLinkingWithSessionUser,
            authenticatingAccountInfo,
            authenticatingUser,
            skipSessionUserUpdateInCore,
            userContext
        );
        if (authTypeInfo.status !== "OK") {
            (0, logger_1.logDebugMessage)(`preAuthChecks returning ${authTypeInfo.status} from checkAuthType results`);
            return authTypeInfo;
        }
        // If the app will not link these accounts after auth, we consider this to be a first factor auth
        if (authTypeInfo.isFirstFactor) {
            (0, logger_1.logDebugMessage)("preAuthChecks getting valid first factors");
            // We check if any factors here are valid first factors.
            // In all apis besides passwordless createCode, we know exactly which factor we are signing into, so in those cases,
            // this is basically just checking if the single factor is allowed or not.
            // For createCode, we filter whatever is allowed, if any of them are allowed, createCode can happen.
            // The filtered list can be used to select email templates. As an example:
            // If the flowType for passwordless is USER_INPUT_CODE_AND_MAGIC_LINK and firstFactors for the tenant we only have otp-email
            // then we do not want to include a link in the email.
            const validFirstFactors = await exports.AuthUtils.filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid(
                factorIds,
                tenantId,
                session !== undefined,
                userContext
            );
            validFactorIds = validFirstFactors;
        } else {
            (0, logger_1.logDebugMessage)("preAuthChecks getting valid secondary factors");
            // In this case the app will try to link the session user and the authenticating user after auth,
            // so we need to check if this is allowed by the MFA recipe (if initialized).
            validFactorIds = await filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid(
                factorIds,
                authTypeInfo.inputUserAlreadyLinkedToSessionUser,
                authTypeInfo.sessionUser,
                session,
                userContext
            );
        }
        if (!isSignUp && authenticatingUser === undefined) {
            throw new Error(
                "This should never happen: preAuthChecks called with isSignUp: false, authenticatingUser: undefined"
            );
        }
        // If this is a sign up we check that the sign up is allowed
        if (isSignUp) {
            // We need this check in case the session user has verified an email address and now tries to add a password for it.
            let verifiedInSessionUser =
                !authTypeInfo.isFirstFactor &&
                authTypeInfo.sessionUser.loginMethods.some(
                    (lm) =>
                        lm.verified &&
                        (lm.hasSameEmailAs(authenticatingAccountInfo.email) ||
                            lm.hasSamePhoneNumberAs(authenticatingAccountInfo.phoneNumber))
                );
            (0, logger_1.logDebugMessage)("preAuthChecks checking if the user is allowed to sign up");
            if (
                !(await recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
                    newUser: authenticatingAccountInfo,
                    isVerified: isVerified || signInVerifiesLoginMethod || verifiedInSessionUser,
                    tenantId,
                    session,
                    userContext,
                }))
            ) {
                return { status: "SIGN_UP_NOT_ALLOWED" };
            }
        } else if (authenticatingUser !== undefined) {
            // for sign ins, this is checked after the credentials have been verified
            (0, logger_1.logDebugMessage)("preAuthChecks checking if the user is allowed to sign in");
            if (
                !(await recipe_1.default.getInstanceOrThrowError().isSignInAllowed({
                    user: authenticatingUser,
                    accountInfo: authenticatingAccountInfo,
                    signInVerifiesLoginMethod,
                    tenantId,
                    session,
                    userContext,
                }))
            ) {
                return { status: "SIGN_IN_NOT_ALLOWED" };
            }
        }
        (0, logger_1.logDebugMessage)("preAuthChecks returning OK");
        // If nothing failed, we return OK
        return {
            status: "OK",
            validFactorIds,
            isFirstFactor: authTypeInfo.isFirstFactor,
        };
    },
    /**
     * Runs the linking process and all check we need to before creating a session + creates the new session if necessary:
     * - runs the linking process which will: try to link to the session user, or link by account info or try to make the authenticated user primary
     * - checks if sign in is allowed (if isSignUp === false)
     * - creates a session if necessary
     * - marks the factor as completed if necessary
     *
     * It returns the following statuses:
     * - OK: the auth flow went as expected
     * - LINKING_TO_SESSION_USER_FAILED(EMAIL_VERIFICATION_REQUIRED): if we couldn't link to the session user because linking requires email verification
     * - LINKING_TO_SESSION_USER_FAILED(RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because the authenticated user has been linked to another primary user concurrently
     * - LINKING_TO_SESSION_USER_FAILED(ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because of a conflicting primary user that has the same account info as authenticatedUser
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should be primary but we couldn't make it primary because of a conflicting primary user.
     */
    postAuthChecks: async function ({
        authenticatedUser,
        recipeUserId,
        isSignUp,
        factorId,
        session,
        req,
        res,
        tenantId,
        userContext,
    }) {
        (0, logger_1.logDebugMessage)(
            `postAuthChecks called ${session !== undefined ? "with" : "without"} a session to ${
                isSignUp ? "sign in" : "sign up"
            } with ${factorId}`
        );
        const mfaInstance = recipe_2.default.getInstance();
        let respSession = session;
        if (session !== undefined) {
            const authenticatedUserLinkedToSessionUser = authenticatedUser.loginMethods.some(
                (lm) => lm.recipeUserId.getAsString() === session.getRecipeUserId(userContext).getAsString()
            );
            if (authenticatedUserLinkedToSessionUser) {
                (0, logger_1.logDebugMessage)(`postAuthChecks session and input user got linked`);
                if (mfaInstance !== undefined) {
                    (0, logger_1.logDebugMessage)(`postAuthChecks marking factor as completed`);
                    // if the authenticating user is linked to the current session user (it means that the factor got set up or completed),
                    // we mark it as completed in the session.
                    await multifactorauth_1.default.markFactorAsCompleteInSession(respSession, factorId, userContext);
                }
            } else {
                // If the new user wasn't linked to the current one, we overwrite the session
                // Note: we could also get here if MFA is enabled, but the app didn't want to link the user to the session user.
                respSession = await session_1.default.createNewSession(
                    req,
                    res,
                    tenantId,
                    recipeUserId,
                    {},
                    {},
                    userContext
                );
                if (mfaInstance !== undefined) {
                    await multifactorauth_1.default.markFactorAsCompleteInSession(respSession, factorId, userContext);
                }
            }
        } else {
            (0, logger_1.logDebugMessage)(`postAuthChecks creating session for first factor sign in/up`);
            // If there is no input session, we do not need to do anything other checks and create a new session
            respSession = await session_1.default.createNewSession(
                req,
                res,
                tenantId,
                recipeUserId,
                {},
                {},
                userContext
            );
            // Here we can always mark the factor as completed, since we just created the session
            if (mfaInstance !== undefined) {
                await multifactorauth_1.default.markFactorAsCompleteInSession(respSession, factorId, userContext);
            }
        }
        return { status: "OK", session: respSession, user: authenticatedUser };
    },
    /**
     * This function tries to find the authenticating user (we use this information to see if the current auth is sign in or up)
     * if a session was passed and the authenticating user was not found on the current tenant, it checks if the session user
     * has a matching login method on other tenants. If it does and the credentials check out on the other tenant, it associates
     * the recipe user for the login method (matching account info, recipeId and credentials) with the current tenant.
     *
     * While this initially complicates the auth logic, we want to avoid creating a new recipe user if a tenant association will do,
     * because it'll make managing MFA factors (i.e.: secondary passwords) a lot easier for the app, and,
     * most importantly, this way all secondary factors are app-wide instead of mixing app-wide (totp) and tenant-wide (password) factors.
     */
    getAuthenticatingUserAndAddToCurrentTenantIfRequired: async ({
        recipeId,
        accountInfo,
        checkCredentialsOnTenant,
        tenantId,
        session,
        userContext,
    }) => {
        let i = 0;
        while (i++ < 300) {
            (0, logger_1.logDebugMessage)(
                `getAuthenticatingUserAndAddToCurrentTenantIfRequired called with ${JSON.stringify(accountInfo)}`
            );
            const existingUsers = await recipe_1.default
                .getInstanceOrThrowError()
                .recipeInterfaceImpl.listUsersByAccountInfo({
                    tenantId,
                    accountInfo,
                    doUnionOfAccountInfo: true,
                    userContext: userContext,
                });
            (0, logger_1.logDebugMessage)(
                `getAuthenticatingUserAndAddToCurrentTenantIfRequired got ${existingUsers.length} users from the core resp`
            );
            const usersWithMatchingLoginMethods = existingUsers
                .map((user) => ({
                    user,
                    loginMethod: user.loginMethods.find(
                        (lm) =>
                            lm.recipeId === recipeId &&
                            ((accountInfo.email !== undefined && lm.hasSameEmailAs(accountInfo.email)) ||
                                lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) ||
                                lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty) ||
                                lm.hasSameWebauthnInfoAs(accountInfo.webauthn))
                    ),
                }))
                .filter(({ loginMethod }) => loginMethod !== undefined);
            (0, logger_1.logDebugMessage)(
                `getAuthenticatingUserAndAddToCurrentTenantIfRequired got ${usersWithMatchingLoginMethods.length} users with matching login methods`
            );
            if (usersWithMatchingLoginMethods.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }
            let authenticatingUser = usersWithMatchingLoginMethods[0];
            if (authenticatingUser === undefined && session !== undefined) {
                (0, logger_1.logDebugMessage)(
                    `getAuthenticatingUserAndAddToCurrentTenantIfRequired checking session user`
                );
                const sessionUser = await (0, _1.getUser)(session.getUserId(userContext), userContext);
                if (sessionUser === undefined) {
                    throw new error_1.default({
                        type: error_1.default.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }
                // Since the session user is not primary, they only have a single login method
                // and we know that that login method is associated with the current tenant.
                // This means that the user has no loginMethods we need to check (that only belong to other tenantIds)
                if (!sessionUser.isPrimaryUser) {
                    (0, logger_1.logDebugMessage)(
                        `getAuthenticatingUserAndAddToCurrentTenantIfRequired session user is non-primary so returning early without checking other tenants`
                    );
                    return undefined;
                }
                const matchingLoginMethodsFromSessionUser = sessionUser.loginMethods.filter(
                    (lm) =>
                        lm.recipeId === recipeId &&
                        (lm.hasSameEmailAs(accountInfo.email) ||
                            lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) ||
                            lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty))
                );
                (0, logger_1.logDebugMessage)(
                    `getAuthenticatingUserAndAddToCurrentTenantIfRequired session has ${matchingLoginMethodsFromSessionUser.length} matching login methods`
                );
                if (matchingLoginMethodsFromSessionUser.some((lm) => lm.tenantIds.includes(tenantId))) {
                    (0, logger_1.logDebugMessage)(
                        `getAuthenticatingUserAndAddToCurrentTenantIfRequired session has ${matchingLoginMethodsFromSessionUser.length} matching login methods`
                    );
                    // This can happen in a race condition where a user was created and linked with the session user
                    // between listing the existing users and loading the session user
                    // We can return early, this only means that someone did the same sharing this function was aiming to do
                    // concurrently.
                    return {
                        user: sessionUser,
                        loginMethod: matchingLoginMethodsFromSessionUser.find((lm) => lm.tenantIds.includes(tenantId)),
                    };
                }
                let goToRetry = false;
                for (const lm of matchingLoginMethodsFromSessionUser) {
                    (0, logger_1.logDebugMessage)(
                        `getAuthenticatingUserAndAddToCurrentTenantIfRequired session checking credentials on ${lm.tenantIds[0]}`
                    );
                    if (await checkCredentialsOnTenant(lm.tenantIds[0])) {
                        (0, logger_1.logDebugMessage)(
                            `getAuthenticatingUserAndAddToCurrentTenantIfRequired associating user from ${lm.tenantIds[0]} with current tenant`
                        );
                        const associateRes = await multitenancy_1.default.associateUserToTenant(
                            tenantId,
                            lm.recipeUserId,
                            userContext
                        );
                        (0, logger_1.logDebugMessage)(
                            `getAuthenticatingUserAndAddToCurrentTenantIfRequired associating returned ${associateRes.status}`
                        );
                        if (associateRes.status === "OK") {
                            // We know that this is what happens
                            lm.tenantIds.push(tenantId);
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
                            throw new error_1.default({
                                type: error_1.default.UNAUTHORISED,
                                message: "Session user not associated with the session tenant",
                            });
                        }
                    }
                }
                if (goToRetry) {
                    (0, logger_1.logDebugMessage)(`getAuthenticatingUserAndAddToCurrentTenantIfRequired retrying`);
                    continue;
                }
            }
            return authenticatingUser;
        }
        throw new Error(
            "This should never happen: ran out of retries for getAuthenticatingUserAndAddToCurrentTenantIfRequired"
        );
    },
    /**
     * This function checks if the current authentication attempt should be considered a first factor or not.
     * To do this it'll also need to (if a session was passed):
     * - load the session user (and possibly make it primary)
     * - check the linking status of the input and session user
     * - call and check the results of shouldDoAutomaticAccountLinking
     * So in the non-first factor case it also returns the results of those checks/operations.
     *
     * It returns the following statuses:
     * - OK: if everything went well
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should be primary but we couldn't make it primary because of a conflicting primary user.
     */
    checkAuthTypeAndLinkingStatus: async function (
        session,
        shouldTryLinkingWithSessionUser,
        accountInfo,
        inputUser,
        skipSessionUserUpdateInCore,
        userContext
    ) {
        (0, logger_1.logDebugMessage)(`checkAuthTypeAndLinkingStatus called`);
        let sessionUser = undefined;
        if (session === undefined) {
            if (shouldTryLinkingWithSessionUser === true) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Session not found but shouldTryLinkingWithSessionUser is true",
                });
            }
            (0, logger_1.logDebugMessage)(
                `checkAuthTypeAndLinkingStatus returning first factor because there is no session`
            );
            // If there is no active session we have nothing to link to - so this has to be a first factor sign in
            return { status: "OK", isFirstFactor: true };
        } else {
            if (shouldTryLinkingWithSessionUser === false) {
                (0, logger_1.logDebugMessage)(
                    `checkAuthTypeAndLinkingStatus returning first factor because shouldTryLinkingWithSessionUser is false`
                );
                // In our normal flows this should never happen - but some user overrides might do this.
                // Anyway, since shouldTryLinkingWithSessionUser explicitly set to false, it's safe to consider this a firstFactor
                return { status: "OK", isFirstFactor: true };
            }
            if (
                !(0, utils_3.recipeInitDefinedShouldDoAutomaticAccountLinking)(
                    recipe_1.default.getInstanceOrThrowError().config
                )
            ) {
                if (shouldTryLinkingWithSessionUser === true) {
                    throw new Error(
                        "Please initialise the account linking recipe and define shouldDoAutomaticAccountLinking to enable MFA"
                    );
                } else {
                    // This is the legacy case where shouldTryLinkingWithSessionUser is undefined
                    if (recipe_2.default.getInstance() !== undefined) {
                        throw new Error(
                            "Please initialise the account linking recipe and define shouldDoAutomaticAccountLinking to enable MFA"
                        );
                    } else {
                        (0, logger_1.logDebugMessage)(
                            `checkAuthTypeAndLinkingStatus (legacy behaviour) returning first factor because MFA is not initialised and shouldDoAutomaticAccountLinking is not defined`
                        );
                        return { status: "OK", isFirstFactor: true };
                    }
                }
            }
            // If we get here:
            // - session is defined
            // - shouldTryLinkingWithSessionUser is true or undefined
            // - shouldDoAutomaticAccountLinking is defined
            // - MFA may or may not be initialized
            // If the input and the session user are the same
            if (inputUser !== undefined && inputUser.id === session.getUserId()) {
                (0, logger_1.logDebugMessage)(
                    `checkAuthTypeAndLinkingStatus returning secondary factor, session and input user are the same`
                );
                // Then this is basically a user logging in with an already linked secondary account
                // Which is basically a factor completion in MFA terms.
                // Since the sessionUser and the inputUser are the same in this case, we can just return early
                return {
                    status: "OK",
                    isFirstFactor: false,
                    inputUserAlreadyLinkedToSessionUser: true,
                    sessionUser: inputUser,
                };
            }
            (0, logger_1.logDebugMessage)(
                `checkAuthTypeAndLinkingStatus loading session user, ${
                    inputUser === null || inputUser === void 0 ? void 0 : inputUser.id
                } === ${session.getUserId()}`
            );
            // We have to load the session user in order to get the account linking info
            const sessionUserResult = await exports.AuthUtils.tryAndMakeSessionUserIntoAPrimaryUser(
                session,
                skipSessionUserUpdateInCore,
                userContext
            );
            if (sessionUserResult.status === "SHOULD_AUTOMATICALLY_LINK_FALSE") {
                if (shouldTryLinkingWithSessionUser === true) {
                    // tryAndMakeSessionUserIntoAPrimaryUser throws if it is an email verification iss
                    throw new _1.Error({
                        message:
                            "shouldDoAutomaticAccountLinking returned false when making the session user primary but shouldTryLinkingWithSessionUser is true",
                        type: "BAD_INPUT_ERROR",
                    });
                }
                return {
                    status: "OK",
                    isFirstFactor: true,
                };
            } else if (
                sessionUserResult.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            ) {
                return {
                    status: "LINKING_TO_SESSION_USER_FAILED",
                    reason: "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                };
            }
            sessionUser = sessionUserResult.sessionUser;
            // We check if the app intends to link these two accounts
            // Note: in some cases if the accountInfo already belongs to a primary user
            const shouldLink = await recipe_1.default
                .getInstanceOrThrowError()
                .config.shouldDoAutomaticAccountLinking(
                    accountInfo,
                    sessionUser,
                    session,
                    session.getTenantId(),
                    userContext
                );
            (0, logger_1.logDebugMessage)(
                `checkAuthTypeAndLinkingStatus session user <-> input user shouldDoAutomaticAccountLinking returned ${JSON.stringify(
                    shouldLink
                )}`
            );
            if (shouldLink.shouldAutomaticallyLink === false) {
                if (shouldTryLinkingWithSessionUser === true) {
                    throw new _1.Error({
                        message:
                            "shouldDoAutomaticAccountLinking returned false when making the session user primary but shouldTryLinkingWithSessionUser is true",
                        type: "BAD_INPUT_ERROR",
                    });
                }
                return { status: "OK", isFirstFactor: true };
            } else {
                return {
                    status: "OK",
                    isFirstFactor: false,
                    inputUserAlreadyLinkedToSessionUser: false,
                    sessionUser,
                    linkingToSessionUserRequiresVerification: shouldLink.shouldRequireVerification,
                };
            }
        }
    },
    /**
     * This function checks the auth type (first factor or not), links by account info for first factor auths otherwise
     * it tries to link the input user to the session user
     *
     * It returns the following statuses:
     * - OK: the linking went as expected
     * - LINKING_TO_SESSION_USER_FAILED(EMAIL_VERIFICATION_REQUIRED): if we couldn't link to the session user because linking requires email verification
     * - LINKING_TO_SESSION_USER_FAILED(RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because the authenticated user has been linked to another primary user concurrently
     * - LINKING_TO_SESSION_USER_FAILED(ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because of a conflicting primary user that has the same account info as authenticatedUser
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should be primary but we couldn't make it primary because of a conflicting primary user.
     */
    linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo: async function ({
        tenantId,
        inputUser,
        recipeUserId,
        session,
        shouldTryLinkingWithSessionUser,
        userContext,
    }) {
        (0, logger_1.logDebugMessage)("linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo called");
        const retry = () => {
            (0, logger_1.logDebugMessage)(
                "linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo retrying...."
            );
            return exports.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId,
                inputUser: inputUser,
                session,
                shouldTryLinkingWithSessionUser,
                recipeUserId,
                userContext,
            });
        };
        // If we got here, we have a session and a primary session user
        // We can not assume the inputUser is non-primary, since we'll only check that seeing if the app wants to link to the session user or not.
        const authLoginMethod = inputUser.loginMethods.find(
            (lm) => lm.recipeUserId.getAsString() === recipeUserId.getAsString()
        );
        if (authLoginMethod === undefined) {
            throw new Error(
                "This should never happen: the recipeUserId and user is inconsistent in createPrimaryUserIdOrLinkByAccountInfo params"
            );
        }
        const authTypeRes = await exports.AuthUtils.checkAuthTypeAndLinkingStatus(
            session,
            shouldTryLinkingWithSessionUser,
            authLoginMethod,
            inputUser,
            false,
            userContext
        );
        if (authTypeRes.status !== "OK") {
            return authTypeRes;
        }
        if (authTypeRes.isFirstFactor) {
            if (
                !(0, utils_3.recipeInitDefinedShouldDoAutomaticAccountLinking)(
                    recipe_1.default.getInstanceOrThrowError().config
                )
            ) {
                (0, logger_1.logDebugMessage)(
                    "linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo skipping link by account info because this is a first factor auth and the app hasn't defined shouldDoAutomaticAccountLinking"
                );
                return { status: "OK", user: inputUser };
            }
            (0, logger_1.logDebugMessage)(
                "linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo trying to link by account info because this is a first factor auth"
            );
            // We try and list all users that can be linked to the input user based on the account info
            // later we can use these when trying to link or when checking if linking to the session user is possible.
            const linkRes = await recipe_1.default
                .getInstanceOrThrowError()
                .tryLinkingByAccountInfoOrCreatePrimaryUser({
                    inputUser: inputUser,
                    session,
                    tenantId,
                    userContext,
                });
            if (linkRes.status === "OK") {
                return { status: "OK", user: linkRes.user };
            }
            if (linkRes.status === "NO_LINK") {
                return { status: "OK", user: inputUser };
            }
            return retry();
        }
        if (authTypeRes.inputUserAlreadyLinkedToSessionUser) {
            return {
                status: "OK",
                user: authTypeRes.sessionUser,
            };
        }
        (0, logger_1.logDebugMessage)(
            "linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo trying to link by session info"
        );
        const sessionLinkingRes = await exports.AuthUtils.tryLinkingBySession({
            sessionUser: authTypeRes.sessionUser,
            authenticatedUser: inputUser,
            authLoginMethod,
            linkingToSessionUserRequiresVerification: authTypeRes.linkingToSessionUserRequiresVerification,
            userContext,
        });
        if (sessionLinkingRes.status === "LINKING_TO_SESSION_USER_FAILED") {
            if (sessionLinkingRes.reason === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                // This means that although we made the session user primary above, some race condition undid that (e.g.: calling unlink concurrently with this func)
                // We can retry in this case, since we start by trying to make it into a primary user and throwing if we can't
                return retry();
            } else {
                return sessionLinkingRes;
            }
        } else {
            // If we get here the status is OK, so we can just return it
            return sessionLinkingRes;
        }
    },
    /**
     * This function loads the session user and tries to make it primary.
     * It returns:
     * - OK: if the session user was a primary user or we made it into one or it can/should become one but `skipSessionUserUpdateInCore` is set to true
     * - SHOULD_AUTOMATICALLY_LINK_FALSE: if shouldDoAutomaticAccountLinking returned `{ shouldAutomaticallyLink: false }`
     * - ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
     * If we tried to make it into a primary user but it didn't succeed because of a conflicting primary user
     *
     * It throws INVALID_CLAIM_ERROR if shouldDoAutomaticAccountLinking returned `{ shouldAutomaticallyLink: false }` but the email verification status was wrong
     */
    tryAndMakeSessionUserIntoAPrimaryUser: async function (session, skipSessionUserUpdateInCore, userContext) {
        (0, logger_1.logDebugMessage)(`tryAndMakeSessionUserIntoAPrimaryUser called`);
        const sessionUser = await (0, _1.getUser)(session.getUserId(), userContext);
        if (sessionUser === undefined) {
            throw new error_1.default({
                type: error_1.default.UNAUTHORISED,
                message: "Session user not found",
            });
        }
        if (sessionUser.isPrimaryUser) {
            (0, logger_1.logDebugMessage)(`tryAndMakeSessionUserIntoAPrimaryUser session user already primary`);
            // if the session user was already primary we can just return it
            return { status: "OK", sessionUser };
        } else {
            // if the session user is not primary we try and make it one
            (0, logger_1.logDebugMessage)(`tryAndMakeSessionUserIntoAPrimaryUser not primary user yet`);
            // We could check here if the session user can even become a primary user, but that'd only mean one extra core call
            // without any added benefits, since the core already checks all pre-conditions
            // We do this check here instead of using the shouldBecomePrimaryUser util, because
            // here we handle the shouldRequireVerification case differently
            const shouldDoAccountLinking = await recipe_1.default
                .getInstanceOrThrowError()
                .config.shouldDoAutomaticAccountLinking(
                    sessionUser.loginMethods[0],
                    undefined,
                    session,
                    session.getTenantId(userContext),
                    userContext
                );
            (0, logger_1.logDebugMessage)(
                `tryAndMakeSessionUserIntoAPrimaryUser shouldDoAccountLinking: ${JSON.stringify(
                    shouldDoAccountLinking
                )}`
            );
            if (shouldDoAccountLinking.shouldAutomaticallyLink) {
                if (skipSessionUserUpdateInCore) {
                    return { status: "OK", sessionUser: sessionUser };
                }
                if (shouldDoAccountLinking.shouldRequireVerification && !sessionUser.loginMethods[0].verified) {
                    // We force-update the claim value if it is not set or different from what we just fetched from the DB
                    if (
                        (await session.getClaimValue(emailverification_1.EmailVerificationClaim, userContext)) !== false
                    ) {
                        (0, logger_1.logDebugMessage)(
                            `tryAndMakeSessionUserIntoAPrimaryUser updating emailverification status in session`
                        );
                        // This will let the frontend know if the value has been updated in the background
                        await session.setClaimValue(emailverification_1.EmailVerificationClaim, false, userContext);
                    }
                    (0, logger_1.logDebugMessage)(`tryAndMakeSessionUserIntoAPrimaryUser throwing validation error`);
                    // Then run the validation expecting it to fail. We run assertClaims instead of throwing the error locally
                    // to make sure the error shape in the response will match what we'd return normally
                    await session.assertClaims(
                        [emailverification_1.EmailVerificationClaim.validators.isVerified()],
                        userContext
                    );
                    throw new Error(
                        "This should never happen: email verification claim validator passed after setting value to false"
                    );
                }
                const createPrimaryUserRes = await recipe_1.default
                    .getInstanceOrThrowError()
                    .recipeInterfaceImpl.createPrimaryUser({
                        recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                        userContext,
                    });
                (0, logger_1.logDebugMessage)(
                    `tryAndMakeSessionUserIntoAPrimaryUser createPrimaryUser returned ${createPrimaryUserRes.status}`
                );
                if (createPrimaryUserRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    // This means that the session user got primary since we loaded the session user info above
                    // but this status means that the user id has also changed, so the session should be invalid
                    throw new error_1.default({
                        type: error_1.default.UNAUTHORISED,
                        message: "Session user not found",
                    });
                } else if (createPrimaryUserRes.status === "OK") {
                    return { status: "OK", sessionUser: createPrimaryUserRes.user };
                } else {
                    // All other statuses signify that we can't make the session user primary
                    // Which means we can't continue
                    return createPrimaryUserRes;
                }
            } else {
                // This means that the app doesn't want to make the session user primary
                return { status: "SHOULD_AUTOMATICALLY_LINK_FALSE" };
            }
        }
    },
    /**
     * This function tries linking by session, and doesn't attempt to make the authenticated user a primary or link it by account info
     *
     * It returns the following statuses:
     * - OK: the linking went as expected
     * - LINKING_TO_SESSION_USER_FAILED(EMAIL_VERIFICATION_REQUIRED): if we couldn't link to the session user because linking requires email verification
     * - LINKING_TO_SESSION_USER_FAILED(RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because the authenticated user has been linked to another primary user concurrently
     * - LINKING_TO_SESSION_USER_FAILED(ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because of a conflicting primary user that has the same account info as authenticatedUser
     * - LINKING_TO_SESSION_USER_FAILED (INPUT_USER_IS_NOT_A_PRIMARY_USER):
     * if the session user is not primary. This can be resolved by making it primary and retrying the call.
     */
    tryLinkingBySession: async function ({
        linkingToSessionUserRequiresVerification,
        authLoginMethod,
        authenticatedUser,
        sessionUser,
        userContext,
    }) {
        (0, logger_1.logDebugMessage)("tryLinkingBySession called");
        // If the input user has another user (and it's not the session user) it could be linked to based on account info then we can't link it to the session user.
        // However, we do not need to check this as the linkAccounts check will fail anyway and we do not want the extra core call in case it succeeds
        // If the session user has already verified the current email address/phone number and wants to add another account with it
        // then we don't want to ask them to verify it again.
        // This is different from linking based on account info, but the presence of a session shows that the user has access to both accounts,
        // and intends to link these two accounts.
        const sessionUserHasVerifiedAccountInfo = sessionUser.loginMethods.some(
            (lm) =>
                (lm.hasSameEmailAs(authLoginMethod.email) || lm.hasSamePhoneNumberAs(authLoginMethod.phoneNumber)) &&
                lm.verified
        );
        const canLinkBasedOnVerification =
            !linkingToSessionUserRequiresVerification || authLoginMethod.verified || sessionUserHasVerifiedAccountInfo;
        if (!canLinkBasedOnVerification) {
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: "EMAIL_VERIFICATION_REQUIRED" };
        }
        // If we get here, it means that the session and the input user can be linked, so we try it.
        // Note that this function will not call shouldDoAutomaticAccountLinking and check the verification status before linking
        // it'll mark the freshly linked recipe user as verified if the email address was verified in the session user.
        let linkAccountsResult = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.linkAccounts({
            recipeUserId: authenticatedUser.loginMethods[0].recipeUserId,
            primaryUserId: sessionUser.id,
            userContext,
        });
        if (linkAccountsResult.status === "OK") {
            (0, logger_1.logDebugMessage)("tryLinkingBySession successfully linked input user to session user");
            return { status: "OK", user: linkAccountsResult.user };
        } else if (linkAccountsResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            // this can happen because of a race condition wherein the recipe user ID get's linked to
            // some other primary user whilst the linking is going on.
            (0, logger_1.logDebugMessage)(
                "tryLinkingBySession linking to session user failed because of a race condition - input user linked to another user"
            );
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: linkAccountsResult.status };
        } else if (linkAccountsResult.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
            (0, logger_1.logDebugMessage)(
                "tryLinkingBySession linking to session user failed because of a race condition - INPUT_USER_IS_NOT_A_PRIMARY_USER, should retry"
            );
            // This can be possible during a race condition wherein the primary user we created above
            // is somehow no more a primary user. This can happen if  the unlink function was called in parallel
            // on that user. We can just retry, as that will try and make it a primary user again.
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: linkAccountsResult.status };
        } else {
            (0, logger_1.logDebugMessage)(
                "tryLinkingBySession linking to session user failed because of a race condition - input user has another primary user it can be linked to"
            );
            // Status can only be "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            // It can come here if the recipe user ID can't be linked to the primary user ID because the email / phone number is associated with
            // some other primary user ID.
            // This can happen due to a race condition in which the email has changed from one primary user to another during this function call,
            // or if another primary user was created with the same email as the input user while this function is running
            return { status: "LINKING_TO_SESSION_USER_FAILED", reason: linkAccountsResult.status };
        }
    },
    filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid: async function (factorIds, tenantId, hasSession, userContext) {
        let validFactorIds = [];
        for (const id of factorIds) {
            // This util takes the tenant config into account (if it exists), then the MFA (static) config if it was initialized and set.
            let validRes = await (0, utils_2.isValidFirstFactor)(tenantId, id, userContext);
            if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                if (hasSession) {
                    throw new error_1.default({
                        type: error_1.default.UNAUTHORISED,
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
            if (!hasSession) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "A valid session is required to authenticate with secondary factors",
                });
            } else {
                throw new error_2.default({
                    type: error_2.default.BAD_INPUT_ERROR,
                    message:
                        "First factor sign in/up called for a non-first factor with an active session. This might indicate that you are trying to use this as a secondary factor, but disabled account linking.",
                });
            }
        }
        return validFactorIds;
    },
    loadSessionInAuthAPIIfNeeded: async function (req, res, shouldTryLinkingWithSessionUser, userContext) {
        if (shouldTryLinkingWithSessionUser !== false) {
            (0, logger_1.logDebugMessage)(
                "loadSessionInAuthAPIIfNeeded: loading session because shouldTryLinkingWithSessionUser is not set to false so we may want to link later"
            );
            return await session_1.default.getSession(
                req,
                res,
                {
                    // This is optional only if shouldTryLinkingWithSessionUser is undefined
                    // in the (old) 3.0 FDI, this flag didn't exist and we linking was based on the session presence and shouldDoAutomaticAccountLinking
                    sessionRequired: shouldTryLinkingWithSessionUser === true,
                    overrideGlobalClaimValidators: () => [],
                },
                userContext
            );
        }
        (0, logger_1.logDebugMessage)(
            "loadSessionInAuthAPIIfNeeded: skipping session loading because we are not linking and we would overwrite it anyway"
        );
        return undefined;
    },
};
async function filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid(
    factorIds,
    inputUserAlreadyLinkedToSessionUser,
    sessionUser,
    session,
    userContext
) {
    if (session === undefined) {
        throw new Error(
            "This should never happen: filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid called without a session"
        );
    }
    if (sessionUser === undefined) {
        throw new Error(
            "This should never happen: filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid called without a sessionUser"
        );
    }
    (0, logger_1.logDebugMessage)(
        `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid called for ${factorIds.join(", ")}`
    );
    const mfaInstance = recipe_2.default.getInstance();
    if (mfaInstance !== undefined) {
        if (!inputUserAlreadyLinkedToSessionUser) {
            let factorsSetUpForUserProm;
            let mfaInfoProm;
            const memoizedAllowedToSetupFactorInput = {
                factorId: "placeholder", // This is updated inside the loop
                session,
                get factorsSetUpForUser() {
                    if (factorsSetUpForUserProm) {
                        return factorsSetUpForUserProm;
                    }
                    factorsSetUpForUserProm = mfaInstance.recipeInterfaceImpl.getFactorsSetupForUser({
                        user: sessionUser,
                        userContext,
                    });
                    return factorsSetUpForUserProm;
                },
                get mfaRequirementsForAuth() {
                    if (mfaInfoProm) {
                        return mfaInfoProm.then((res) => res.mfaRequirementsForAuth);
                    }
                    mfaInfoProm = (0, utils_1.updateAndGetMFARelatedInfoInSession)({
                        session,
                        userContext,
                    });
                    return mfaInfoProm.then((res) => res.mfaRequirementsForAuth);
                },
                userContext,
            };
            // If we are linking the input user to the session user, then we need to check if MFA allows it
            // From an MFA perspective this is a factor setup
            (0, logger_1.logDebugMessage)(
                `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid checking if linking is allowed by the mfa recipe`
            );
            let caughtSetupFactorError;
            const validFactorIds = [];
            // In all apis besides passwordless createCode, we know exactly which factor we are signing into, so in those cases,
            // this is basically just checking if the single factor is allowed to be setup or not.
            // For createCode (if the FE didn't pass the factor id exactly, which it should for MFA),
            // we filter whatever is allowed. If any of them are allowed, createCode can happen.
            // The filtered list can be used to select email templates. As an example:
            // If the flowType for passwordless is USER_INPUT_CODE_AND_MAGIC_LINK and but only the otp-email factor is allowed to be set up
            // then we do not want to include a link in the email.
            for (const id of factorIds) {
                (0, logger_1.logDebugMessage)(
                    `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid checking assertAllowedToSetupFactorElseThrowInvalidClaimError`
                );
                try {
                    memoizedAllowedToSetupFactorInput.factorId = id;
                    await mfaInstance.recipeInterfaceImpl.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                        memoizedAllowedToSetupFactorInput
                    );
                    (0, logger_1.logDebugMessage)(
                        `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid ${id} valid because assertAllowedToSetupFactorElseThrowInvalidClaimError passed`
                    );
                    // we add it to the valid factor ids list since it is either already set up or allowed to be set up
                    validFactorIds.push(id);
                } catch (err) {
                    (0, logger_1.logDebugMessage)(
                        `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid assertAllowedToSetupFactorElseThrowInvalidClaimError failed for ${id}`
                    );
                    caughtSetupFactorError = err;
                }
            }
            if (validFactorIds.length === 0) {
                (0, logger_1.logDebugMessage)(
                    `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid rethrowing error from assertAllowedToSetupFactorElseThrowInvalidClaimError because we found no valid factors`
                );
                // we can safely re-throw this since this should be an InvalidClaimError
                // if it's anything else, we do not really have a way of handling it anyway.
                throw caughtSetupFactorError;
            }
            return validFactorIds;
        } else {
            // If signing in will not change the user (no linking), then we can let the sign-in/up happen (if allowed by account linking checks)
            (0, logger_1.logDebugMessage)(
                `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid allowing all factors because it'll not create new link`
            );
            return factorIds;
        }
    } else {
        (0, logger_1.logDebugMessage)(
            `filterOutInvalidSecondFactorsOrThrowIfAllAreInvalid allowing all factors because MFA is not enabled`
        );
        // If MFA is not enabled, we allow the user to connect any secondary account to the session user.
        return factorIds;
    }
}
