"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../multitenancy"));
const multiFactorAuthClaim_1 = require("../multiFactorAuthClaim");
const __1 = require("../../..");
function getAPIInterface() {
    return {
        mfaInfoGET: async ({ options, session, userContext }) => {
            var _a, _b, _c;
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await __1.getUser(userId, userContext);
            if (user === undefined) {
                throw new Error("Unknown User ID provided");
            }
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            const isAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                tenantId,
                user,
                userContext,
            });
            const availableFactors = await options.recipeImplementation.getAllAvailableFactorIds({ userContext });
            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const defaultRequiredFactorIdsForUser = await options.recipeImplementation.getDefaultRequiredFactorsForUser(
                {
                    user: user,
                    tenantId,
                    userContext,
                }
            );
            const completedFactorsClaimValue = await session.getClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                userContext
            );
            const completedFactors =
                (_a =
                    completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                        ? void 0
                        : completedFactorsClaimValue.c) !== null && _a !== void 0
                    ? _a
                    : {};
            const mfaRequirementsForAuth = await options.recipeImplementation.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser: isAlreadySetup,
                defaultRequiredFactorIdsForTenant:
                    (_b =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                        null && _b !== void 0
                        ? _b
                        : [],
                defaultRequiredFactorIdsForUser,
                completedFactors: completedFactors,
                userContext,
            });
            const isAllowedToSetup = [];
            for (const id of availableFactors) {
                if (
                    await options.recipeImplementation.isAllowedToSetupFactor({
                        session,
                        factorId: id,
                        completedFactors: completedFactors,
                        defaultRequiredFactorIdsForTenant:
                            (_c =
                                tenantInfo === null || tenantInfo === void 0
                                    ? void 0
                                    : tenantInfo.defaultRequiredFactorIds) !== null && _c !== void 0
                                ? _c
                                : [],
                        defaultRequiredFactorIdsForUser,
                        factorsSetUpForUser: isAlreadySetup,
                        mfaRequirementsForAuth,
                        userContext,
                    })
                ) {
                    isAllowedToSetup.push(id);
                }
            }
            await session.setClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, {
                c: completedFactors,
                n: multiFactorAuthClaim_1.MultiFactorAuthClaim.buildNextArray(completedFactors, mfaRequirementsForAuth),
            });
            return {
                status: "OK",
                factors: {
                    isAllowedToSetup,
                    isAlreadySetup,
                },
                email: user.emails[0],
                phoneNumber: user.phoneNumbers[0],
            };
        },
    };
}
exports.default = getAPIInterface;
