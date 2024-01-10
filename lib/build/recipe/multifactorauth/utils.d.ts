// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import { TypeInput, TypeNormalisedInput, MFAClaimValue } from "./types";
import MultiFactorAuthRecipe from "./recipe";
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
export declare function getFactorFlowControlFlags(
    req: BaseRequest,
    res: BaseResponse,
    userContext: UserContext
): Promise<{
    shouldCheckIfSignInIsAllowed: boolean;
    shouldCheckIfSignUpIsAllowed: boolean;
    shouldAttemptAccountLinking: boolean;
    shouldCreateSession: boolean;
    session: import("../session").SessionContainer | undefined;
    mfaInstance: MultiFactorAuthRecipe | undefined;
}>;
export declare const isValidFirstFactor: (
    tenantId: string,
    factorId: string,
    userContext: UserContext
) => Promise<boolean>;
