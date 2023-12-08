"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../usermetadata/recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const session_1 = __importDefault(require("../session"));
const recipe_2 = __importDefault(require("../session/recipe"));
const multitenancy_1 = __importDefault(require("../multitenancy"));
const recipe_3 = __importDefault(require("../accountlinking/recipe"));
const __1 = require("../..");
const logger_1 = require("../../logger");
function getRecipeInterface(config, recipeInstance) {
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
            const allFactors = new Set();
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
            allFactors.delete(oldestFactor); // Removing the first factor if it exists
            return [{ oneOf: [...allFactors] }];
        },
        isAllowedToSetupFactor: async function ({ factorId, session, factorsSetUpForUser, userContext }) {
            const claimVal = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, userContext);
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
                logger_1.logDebugMessage(
                    `isAllowedToSetupFactor ${factorId}: false because there are items already set up in the next array: ${claimVal.n.join(
                        ", "
                    )}`
                );
                return false;
            }
            logger_1.logDebugMessage(
                `isAllowedToSetupFactor ${factorId}: true because the next array is ${
                    claimVal.n.length === 0 ? "empty" : "cannot be completed otherwise"
                }`
            );
            return true;
        },
        markFactorAsCompleteInSession: async function ({ session, factorId, userContext }) {
            var _a;
            const currentValue = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim);
            const completed = Object.assign(
                Object.assign({}, currentValue === null || currentValue === void 0 ? void 0 : currentValue.c),
                { [factorId]: Math.floor(Date.now() / 1000) }
            );
            const tenantId = session.getTenantId();
            const user = await __1.getUser(session.getUserId(), userContext);
            if (user === undefined) {
                throw new Error("User not found!");
            }
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            const defaultRequiredFactorIdsForUser = await this.getDefaultRequiredFactorsForUser({
                user: user,
                tenantId,
                userContext,
            });
            const factorsSetUpForUser = await this.getFactorsSetupForUser({
                user: user,
                userContext,
            });
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser,
                defaultRequiredFactorIdsForTenant:
                    (_a =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                        null && _a !== void 0
                        ? _a
                        : [],
                defaultRequiredFactorIdsForUser,
                completedFactors: completed,
                userContext,
            });
            const next = multiFactorAuthClaim_1.MultiFactorAuthClaim.buildNextArray(completed, mfaRequirementsForAuth);
            await session.setClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, {
                c: completed,
                n: next,
            });
        },
        addToDefaultRequiredFactorsForUser: async function ({ user, factorId, userContext }) {
            var _a, _b;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });
            const factorIds =
                (_b =
                    (_a = metadata.metadata._supertokens) === null || _a === void 0
                        ? void 0
                        : _a.defaultRequiredFactorIdsForUser) !== null && _b !== void 0
                    ? _b
                    : [];
            if (factorIds.includes(factorId)) {
                return;
            }
            factorIds.push(factorId);
            const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
                _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                    defaultRequiredFactorIdsForUser: factorIds,
                }),
            });
            await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
                userId: user.id,
                metadataUpdate,
                userContext,
            });
        },
        getDefaultRequiredFactorsForUser: async function ({ user, userContext }) {
            var _a, _b;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId: user.id,
                userContext,
            });
            return (_b =
                (_a = metadata.metadata._supertokens) === null || _a === void 0
                    ? void 0
                    : _a.defaultRequiredFactorIdsForUser) !== null && _b !== void 0
                ? _b
                : [];
        },
        validateForMultifactorAuthBeforeFactorCompletion: async function ({
            tenantId,
            factorIdInProgress,
            session,
            userLoggingIn,
            isAlreadySetup,
            userContext,
        }) {
            var _a, _b, _c, _d;
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            const validFirstFactors =
                (tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.firstFactors) ||
                config.firstFactors ||
                recipeInstance.getAllAvailableFirstFactorIds();
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
                sessionUser = await __1.getUser(session.getUserId(), userContext);
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
            const completedFactorsClaimValue = await session.getClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                userContext
            );
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser,
                defaultRequiredFactorIdsForTenant:
                    (_a =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                        null && _a !== void 0
                        ? _a
                        : [],
                defaultRequiredFactorIdsForUser,
                completedFactors:
                    (_b =
                        completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                            ? void 0
                            : completedFactorsClaimValue.c) !== null && _b !== void 0
                        ? _b
                        : {},
                userContext,
            });
            const canSetup = await this.isAllowedToSetupFactor({
                session,
                factorId: factorIdInProgress,
                completedFactors:
                    (_c =
                        completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                            ? void 0
                            : completedFactorsClaimValue.c) !== null && _c !== void 0
                        ? _c
                        : {},
                defaultRequiredFactorIdsForTenant:
                    (_d =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                        null && _d !== void 0
                        ? _d
                        : [],
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
        createOrUpdateSessionForMultifactorAuthAfterFactorCompletion: async function ({
            req,
            res,
            tenantId,
            factorIdInProgress,
            justCompletedFactorUserInfo,
            userContext,
        }) {
            let session = await session_1.default.getSession(req, res, { sessionRequired: false });
            if (
                session === undefined // no session exists, so we can create a new one
            ) {
                if (justCompletedFactorUserInfo === undefined) {
                    throw new Error("should never come here"); // We wouldn't create new session from a recipe like TOTP
                }
                const newSession = await session_1.default.createNewSession(
                    req,
                    res,
                    tenantId,
                    justCompletedFactorUserInfo.recipeUserId,
                    {},
                    {},
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
            while (true) {
                // loop to handle race conditions
                const sessionUser = await __1.getUser(session.getUserId(), userContext);
                // race condition, user deleted throw unauthorized
                if (sessionUser === undefined) {
                    // TODO MFA throw unauthorized
                    return {
                        status: "SESSION_USER_NOT_FOUND_ERROR",
                        message: "User for this session was not found. Please contact support. (ERR_CODE_010)",
                    };
                }
                if (justCompletedFactorUserInfo !== undefined) {
                    if (justCompletedFactorUserInfo.createdNewUser) {
                        // This is a newly created user, so it must be account linked with the session user
                        if (!sessionUser.isPrimaryUser) {
                            const createPrimaryRes = await recipe_3.default
                                .getInstance()
                                .recipeInterfaceImpl.createPrimaryUser({
                                    recipeUserId: new recipeUserId_1.default(sessionUser.id),
                                    userContext,
                                });
                            if (
                                createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                            ) {
                                // Race condition
                                // TODO MFA invalidate querier cache
                                continue;
                            } else if (
                                createPrimaryRes.status ===
                                "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                            ) {
                                return {
                                    status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                    message:
                                        "Error setting up MFA for the user. Please contact support. (ERR_CODE_011)",
                                };
                            }
                        }
                        const linkRes = await recipe_3.default.getInstance().recipeInterfaceImpl.linkAccounts({
                            recipeUserId: justCompletedFactorUserInfo.recipeUserId,
                            primaryUserId: sessionUser.id,
                            userContext,
                        });
                        if (linkRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                            // TODO MFA contact support
                            throw new Error("should never happen"); // new user shouldn't have this issue
                        } else if (linkRes.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                            // Race condition
                            // TODO MFA clear querier cache
                            continue;
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
                            if (recipe_2.default.getInstanceOrThrowError().config.overwriteSessionDuringSignIn) {
                                session = await session_1.default.createNewSession(
                                    req,
                                    res,
                                    tenantId,
                                    justCompletedFactorUserInfo.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                            }
                            return {
                                status: "OK",
                                session: session,
                            };
                        }
                    }
                }
                break;
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
exports.default = getRecipeInterface;
