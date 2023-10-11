"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRecipeInterface(_querier) {
    return {
        // markFactorAsCompleteInSession: async ({ session, factor, userContext }) => {
        //     const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
        //     const completed = {
        //         ...currentValue?.c,
        //         [factor]: Math.floor(Date.now() / 1000),
        //     };
        //     const setupUserFactors = await this.recipeInterfaceImpl.getFactorsSetupForUser({
        //         userId: session.getUserId(),
        //         tenantId: session.getTenantId(),
        //         userContext,
        //     });
        //     const requirements = await this.config.getMFARequirementsForAuth(
        //         session,
        //         setupUserFactors,
        //         completed,
        //         userContext
        //     );
        //     const next = MultiFactorAuthClaim.buildNextArray(completed, requirements);
        //     await session.setClaimValue(MultiFactorAuthClaim, {
        //         c: completed,
        //         n: next,
        //     });
        // },
    };
}
exports.default = getRecipeInterface;
