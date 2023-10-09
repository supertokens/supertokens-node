// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo } from "../../types";
import { BaseRequest } from "../../framework";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function getEmailVerifyLink(input: {
    appInfo: NormalisedAppinfo;
    token: string;
    recipeId: string;
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: any;
}): string;
