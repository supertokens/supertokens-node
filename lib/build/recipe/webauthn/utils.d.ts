// @ts-nocheck
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo, UserContext } from "../../types";
import type { BaseRequest } from "../../framework";
export declare function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
export declare function defaultEmailValidator(
    value: any
): Promise<"Email is invalid" | "Development bug: Please make sure the email field yields a string" | undefined>;
export declare function getRecoverAccountLink(input: {
    appInfo: NormalisedAppinfo;
    token: string;
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: UserContext;
}): string;
