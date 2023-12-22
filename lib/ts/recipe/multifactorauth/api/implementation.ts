import Multitenancy from "../../multitenancy";
import { APIInterface } from "../";
import { MultiFactorAuthClaim } from "../multiFactorAuthClaim";
import { getUser } from "../../..";
import SessionError from "../../session/error";

export default function getAPIInterface(): APIInterface {
    return {
        mfaInfoGET: async ({ options, session, userContext }) => {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await getUser(userId, userContext);

            if (user === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);

            if (tenantInfo === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Tenant not found",
                });
            }

            const isAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                tenantId,
                user,
                userContext,
            });

            const { status: _, ...tenantConfig } = tenantInfo;

            const availableFactors = await options.recipeInstance.getAllAvailableFactorIds(tenantConfig);

            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const requiredSecondaryFactorsForUser = await options.recipeImplementation.getRequiredSecondaryFactorsForUser(
                {
                    userId,
                    userContext,
                }
            );
            const completedFactorsClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            const completedFactors = completedFactorsClaimValue?.c ?? {};
            const mfaRequirementsForAuth = await options.recipeImplementation.getMFARequirementsForAuth({
                user: user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId,
                factorsSetUpForUser: isAlreadySetup,
                requiredSecondaryFactorsForTenant: tenantInfo?.requiredSecondaryFactors ?? [],
                requiredSecondaryFactorsForUser,
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
                        requiredSecondaryFactorsForTenant: tenantInfo?.requiredSecondaryFactors ?? [],
                        requiredSecondaryFactorsForUser,
                        factorsSetUpForUser: isAlreadySetup,
                        mfaRequirementsForAuth,
                        userContext,
                    })
                ) {
                    isAllowedToSetup.push(id);
                }
            }

            await session.fetchAndSetClaim(MultiFactorAuthClaim, userContext);

            return {
                status: "OK",
                factors: {
                    isAllowedToSetup,
                    isAlreadySetup,
                },
                emails: options.recipeInstance.getEmailsForFactors(user),
                phoneNumbers: options.recipeInstance.getPhoneNumbersForFactors(user),
            };
        },
    };
}
