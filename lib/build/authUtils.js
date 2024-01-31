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
const multifactorauth_1 = __importDefault(require("./recipe/multifactorauth"));
const recipe_2 = __importDefault(require("./recipe/multifactorauth/recipe"));
const utils_1 = require("./recipe/multifactorauth/utils");
const error_1 = __importDefault(require("./recipe/session/error"));
const _1 = require(".");
const logger_1 = require("./logger");
const recipe_3 = __importDefault(require("./recipe/session/recipe"));
exports.AuthUtils = {
    preAuthChecks: async function ({ accountInfo, tenantId, isSignUp, isVerified, factorIds, session, userContext }) {
        const accountLinkingInstance = recipe_1.default.getInstance();
        const mfaInstance = recipe_2.default.getInstance();
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
            sessionUser = await _1.getUser(session.getUserId(), userContext);
            if (sessionUser === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            // TODO: verify this
            // If the session user has already verified the current email address/phone number and wants to add another account with it
            // then we don't want to ask them to verify it again.
            // This is different from linking based on account info, but the presence of a session shows that the user has access to both accounts,
            // and intends to link these two accounts.
            const sessionUserHasVerifiedAccountInfo = sessionUser.loginMethods.some(
                (lm) => lm.email === accountInfo.email && lm.phoneNumber === accountInfo.phoneNumber && lm.verified
            );
            // We check if the app intends to link these two accounts
            // Note that this will be called even for already linked account info - user pairs
            const shouldLink = await accountLinkingInstance.config.shouldDoAutomaticAccountLinking(
                accountInfo,
                sessionUser,
                session,
                tenantId,
                userContext
            );
            // TODO: this'll make us consider EP signups as first factor if `shouldRequireVerification` is true and the user doesn't have the same email address
            // TODO: an alternative would be to throw if the verification status is wrong but shouldAutomaticallyLink is true.
            wantToLinkSessionUser =
                shouldLink.shouldAutomaticallyLink &&
                (!shouldLink.shouldRequireVerification || isVerified || sessionUserHasVerifiedAccountInfo);
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
                let validRes = await utils_1.isValidFirstFactor(tenantId, id, userContext);
                if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                    throw new Error("Tenant not found");
                } else if (validRes.status === "OK") {
                    validFactorIds.push(id);
                }
            }
            if (validFactorIds.length === 0) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
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
                const factorsAlreadySetUp = await multifactorauth_1.default.getFactorsSetupForUser(
                    session.getUserId(userContext),
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
                            await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                                session,
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
                return { status: "SIGN_IN_UP_NOT_ALLOWED" };
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
    }) {
        const mfaInstance = recipe_2.default.getInstance();
        const accountLinkingInstance = recipe_1.default.getInstance();
        // We check if sign in is allowed
        if (
            !isSignUp &&
            !(await accountLinkingInstance.isSignInAllowed({ user: responseUser, tenantId, session, userContext }))
        ) {
            return { status: "SIGN_IN_NOT_ALLOWED" };
        }
        // Then run linking if necessary/possible.
        // Note, that we are not re-using any information queried before the user signed in
        // This functions calls shouldDoAutomaticAccountLinking again (we check if the app wants to link to the session user or not),
        // which might return a different result. We could throw in this case, but it is an app code issue that that is fairly unlikely to go wrong.
        // It should not happen in general, but it is possible that we end up with an unlinked user after this even though originally we considered this
        // an MFA sign in.
        // There are a couple of race-conditions associated with this functions, but it handles retries internally.
        const postLinkUser = await accountLinkingInstance.createPrimaryUserIdOrLinkAccounts({
            tenantId,
            user: responseUser,
            session,
            userContext,
        });
        let respSession = session;
        if (session !== undefined) {
            const postLinkUserLinkedToSessionUser = postLinkUser.loginMethods.some(
                (lm) => lm.recipeUserId === session.getRecipeUserId()
            );
            if (postLinkUserLinkedToSessionUser) {
                // If the session user gets linked to the authenticating user we may end up in a situation where the userId of the session needs to change
                if (postLinkUser.id !== session.getUserId()) {
                    logger_1.logDebugMessage(
                        "postAuthChecks the session user id doesn't match the primary user id, so we are revoking all sessions and creating a new one"
                    );
                    await session_1.default.revokeAllSessionsForUser(
                        session.getUserId(),
                        false,
                        session.getTenantId(),
                        userContext
                    );
                    // create a new session keeping the payloads from the input session
                    respSession = await session_1.default.createNewSession(
                        req,
                        res,
                        session.getTenantId(userContext),
                        session.getRecipeUserId(userContext),
                        session.getAccessTokenPayload(userContext),
                        session.getSessionDataFromDatabase(userContext),
                        userContext
                    );
                }
                if (mfaInstance !== undefined) {
                    // if the authenticating user is linked to the current user (it means that the factor got set up or completed),
                    // so we mark it as completed in the session.
                    await multifactorauth_1.default.markFactorAsCompleteInSession(respSession, factorId, userContext);
                }
            } else {
                // If the new user wasn't linked to the current one, we check the config and overwrite the session if required
                // Note: we could also get here if MFA is enabled, but the app didn't want to link the user to the session user.
                // This is intentional, since the MFA and overwriteSessionDuringSignInUp configs should work independently.
                let overwriteSessionDuringSignInUp = recipe_3.default.getInstanceOrThrowError().config
                    .overwriteSessionDuringSignInUp;
                if (overwriteSessionDuringSignInUp) {
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
                        await multifactorauth_1.default.markFactorAsCompleteInSession(
                            respSession,
                            factorId,
                            userContext
                        );
                    }
                }
            }
        } else {
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
        return { status: "OK", session: respSession, user: postLinkUser };
    },
};
