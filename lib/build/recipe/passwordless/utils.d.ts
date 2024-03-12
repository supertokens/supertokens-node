// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function defaultValidatePhoneNumber(value: string): Promise<string | undefined> | string | undefined;
export declare function defaultValidateEmail(value: string): Promise<string | undefined> | string | undefined;
export declare function getEnabledPwlessFactors(config: TypeInput): string[];
