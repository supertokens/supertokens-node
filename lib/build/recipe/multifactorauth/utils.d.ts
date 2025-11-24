// @ts-nocheck
import { TypeInput, TypeNormalisedInput, MFAClaimValue, MFARequirementList } from "./types";
import { UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { RecipeUserId } from "../..";
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
    completedFactors: MFAClaimValue["c"];
    mfaRequirementsForAuth: MFARequirementList;
    isMFARequirementsForAuthSatisfied: boolean;
}>;
