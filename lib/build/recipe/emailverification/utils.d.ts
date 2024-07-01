// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo, UserContext } from "../../types";
import { BaseRequest } from "../../framework";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function getEmailVerifyLink(input: {
    appInfo: NormalisedAppinfo;
    token: string;
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: UserContext;
}): string;
