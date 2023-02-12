// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
