// @ts-nocheck
import { TypeInput, TypeNormalisedInput, MFAClaimValue, MFARequirementList } from "./types";
import { UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { RecipeUserId, User } from "../..";
import { TenantConfig } from "../multitenancy/types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare const updateAndGetMFARelatedInfoInSession: (
    input: (
        | {
              sessionRecipeUserId: RecipeUserId;
              tenantId: string;
              accessTokenPayload: any;
          }
        | {
              session: SessionContainerInterface;
          }
    ) & {
        updatedFactorId?: string;
        userContext: UserContext;
    }
) => Promise<{
    sessionUser: User;
    factorsSetUpForUser: string[];
    completedFactors: MFAClaimValue["c"];
    requiredSecondaryFactorsForUser: string[];
    requiredSecondaryFactorsForTenant: string[];
    mfaRequirementsForAuth: MFARequirementList;
    tenantConfig: TenantConfig;
    isMFARequirementsForAuthSatisfied: boolean;
}>;
