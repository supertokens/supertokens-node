import { RecipeInterface } from "./";
import { Querier } from "../../querier";

export default function getRecipeInterface(_querier: Querier): RecipeInterface {
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
    } as any;
}
