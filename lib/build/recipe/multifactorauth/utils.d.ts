// @ts-nocheck
import { TypeInput, TypeNormalisedInput, MFAClaimValue } from "./types";
import { UserContext } from "../../types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare function checkFactorRequirement(
    req: string,
    completedFactors: MFAClaimValue["c"]
): {
    id: string;
    isValid: boolean;
    message: string;
};
export declare const isValidFirstFactor: (
    tenantId: string,
    factorId: string,
    userContext: UserContext
) => Promise<boolean>;
