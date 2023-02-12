// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import { TypeProvider } from "./types";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function findRightProvider(
    providers: TypeProvider[],
    thirdPartyId: string,
    clientId?: string
): TypeProvider | undefined;
