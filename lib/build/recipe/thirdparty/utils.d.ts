// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import Recipe from "./recipe";
import { TypeProvider } from "./types";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function findRightProvider(
    providers: TypeProvider[],
    thirdPartyId: string,
    clientId?: string
): TypeProvider | undefined;
