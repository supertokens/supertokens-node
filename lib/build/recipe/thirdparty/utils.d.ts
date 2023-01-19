// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import { User } from "./types";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
export declare function updateTenantId(user: User): User;
