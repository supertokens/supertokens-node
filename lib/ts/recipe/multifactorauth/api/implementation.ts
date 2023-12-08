import Multitenancy from "../../multitenancy";
import { APIInterface } from "../";
import { MultiFactorAuthClaim } from "../multiFactorAuthClaim";
import { getUser } from "../../..";

export default function getAPIInterface(): APIInterface {
    return {
        mfaInfoGET: async ({ options, session, userContext }) => {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await getUser(userId, userContext);

            if (user === undefined) {
                throw new Error("Unknown User ID provided");
            }
            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);

            const isAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                user,
                userContext,
            });

            const availableFactors = await options.recipeInstance.getAllAvailableFactorIds();

            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const defaultRequiredFactorIdsForUser = await options.recipeImplementation.getDefaultRequiredFactorsForUser(
                {
                    user: user!,
                    tenantId,
                    userContext,
                }
            );
            const completedFactorsClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            const completedFactors = completedFactorsClaimValue?.c ?? {};
            const mfaRequirementsForAuth = await options.recipeImplementation.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser: isAlreadySetup,
                defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
                defaultRequiredFactorIdsForUser,
                completedFactors: completedFactors,
                userContext,
            });

            await session.setClaimValue(MultiFactorAuthClaim, {
                c: completedFactors,
                n: MultiFactorAuthClaim.buildNextArray(completedFactors, mfaRequirementsForAuth),
            });

            const isAllowedToSetup = [];
            for (const id of availableFactors) {
                if (
                    await options.recipeImplementation.isAllowedToSetupFactor({
                        session,
                        factorId: id,
                        completedFactors: completedFactors,
                        defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
                        defaultRequiredFactorIdsForUser,
                        factorsSetUpForUser: isAlreadySetup,
                        mfaRequirementsForAuth,
                        userContext,
                    })
                ) {
                    isAllowedToSetup.push(id);
                }
            }

            let selectedEmail = user.emails[0];

            for (const loginMethod of user.loginMethods) {
                if (loginMethod.recipeUserId.getAsString() === session.getRecipeUserId().getAsString()) {
                    if (loginMethod.email !== undefined) {
                        selectedEmail = loginMethod.email;
                    }
                    break;
                }
            }

            return {
                status: "OK",
                factors: {
                    isAllowedToSetup,
                    isAlreadySetup,
                },
                email: selectedEmail,
                phoneNumber: user.phoneNumbers[0],
            };
        },
    };
}
