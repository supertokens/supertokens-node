// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import TotpRecipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(
    _: TotpRecipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
