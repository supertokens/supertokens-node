// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo } from "../../types";
import { User } from "../../user";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function defaultValidatePhoneNumber(value: string): Promise<string | undefined> | string | undefined;
export declare function defaultValidateEmail(value: string): Promise<string | undefined> | string | undefined;
export declare function isFactorSetupForUser(user: User, factorId: string): boolean;
