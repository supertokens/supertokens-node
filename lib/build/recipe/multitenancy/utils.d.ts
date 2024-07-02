// @ts-nocheck
import { TypeInput, TypeNormalisedInput, TenantConfig } from "./types";
import { UserContext } from "../../types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare const isValidFirstFactor: (
    tenantId: string,
    factorId: string,
    userContext: UserContext
) => Promise<
    | {
          status: "OK";
      }
    | {
          status: "INVALID_FIRST_FACTOR_ERROR";
      }
    | {
          status: "TENANT_NOT_FOUND_ERROR";
      }
>;
export declare function isFactorConfiguredForTenant({
    allAvailableFirstFactors,
    firstFactors,
    factorId,
}: {
    tenantConfig: TenantConfig;
    allAvailableFirstFactors: string[];
    firstFactors: string[];
    factorId: string;
}): boolean;
