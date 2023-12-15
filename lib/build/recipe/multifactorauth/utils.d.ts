// @ts-nocheck
import { TypeInput, TypeNormalisedInput, MFAClaimValue } from "./types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare function checkFactorRequirement(
    req: string,
    completedFactors: MFAClaimValue["c"]
): {
    id: string;
    isValid: boolean;
    message: string;
};
