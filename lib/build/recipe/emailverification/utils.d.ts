// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function getEmailVerifyLink(input: {
    appInfo: NormalisedAppinfo;
    token: string;
    recipeId: string;
}): string;
