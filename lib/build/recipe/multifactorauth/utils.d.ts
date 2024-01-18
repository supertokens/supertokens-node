// @ts-nocheck
import { TypeInput, TypeNormalisedInput, MFAClaimValue, MFARequirementList } from "./types";
import { UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { User } from "../..";
import { TenantConfig } from "../multitenancy/types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare const isValidFirstFactor: (
    tenantId: string,
    factorId: string,
    userContext: UserContext
) => Promise<boolean>;
export declare const getMFARelatedInfoFromSession: (
    input: (
        | {
              userId: string;
              tenantId: string;
              accessTokenPayload: any;
          }
        | {
              session: SessionContainerInterface;
          }
    ) & {
        assumeEmptyCompletedIfNotFound: boolean;
        userContext: UserContext;
    }
) => Promise<
    | {
          status: "SESSION_USER_NOT_FOUND_ERROR" | "MFA_CLAIM_VALUE_NOT_FOUND_ERROR" | "TENANT_NOT_FOUND_ERROR";
      }
    | {
          status: "OK";
          sessionUser: User;
          factorsSetUpForUser: string[];
          completedFactors: MFAClaimValue["c"];
          requiredSecondaryFactorsForUser: string[];
          requiredSecondaryFactorsForTenant: string[];
          mfaRequirementsForAuth: MFARequirementList;
          tenantConfig: TenantConfig;
      }
>;
