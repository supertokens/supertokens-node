// @ts-nocheck
import NormalisedURLPath from "../../normalisedURLPath";
import { HTTPMethod, NormalisedAppinfo } from "../../types";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput;
export declare function isApiPath(path: NormalisedURLPath, appInfo: NormalisedAppinfo): boolean;
export declare function getApiIdIfMatched(path: NormalisedURLPath, method: HTTPMethod): string | undefined;
export declare function isValidApiKey(key: string, config: TypeNormalisedInput): boolean;
