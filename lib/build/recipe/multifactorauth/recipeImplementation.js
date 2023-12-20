"use strict";
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../usermetadata/recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const multitenancy_1 = __importDefault(require("../multitenancy"));
const __1 = require("../..");
const logger_1 = require("../../logger");
function getRecipeInterface(recipeInstance) {
    return {
        getFactorsSetupForUser: async function ({ tenantId, user, userContext }) {
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            if (tenantInfo === undefined) {
                throw new Error("should never happen");
            }
            let { status: _ } = tenantInfo,
                tenantConfig = __rest(tenantInfo, ["status"]);
            let factorIds = [];
            for (const func of recipeInstance.getFactorsSetupForUserFromOtherRecipesFuncs) {
                let result = await func(user, tenantConfig, userContext);
                if (result !== undefined) {
                    factorIds = factorIds.concat(result);
                }
            }
            return factorIds;
        },
        getMFARequirementsForAuth: async function ({
            defaultRequiredFactorIdsForUser,
            defaultRequiredFactorIdsForTenant,
        }) {
            const allFactors = new Set();
            for (const factor of defaultRequiredFactorIdsForUser) {
                allFactors.add(factor);
            }
            for (const factor of defaultRequiredFactorIdsForTenant) {
                allFactors.add(factor);
            }
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
                tenantId,
                userContext,
            });
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId,
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
    };
}
exports.default = getRecipeInterface;
