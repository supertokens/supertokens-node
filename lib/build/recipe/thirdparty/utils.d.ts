// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
export declare function isFakeEmail(email: string): boolean;
/**
 * Returns the (protocol, lowercased hostname, port) tuple of an absolute http(s) URL, filling in the
 * default port if it is not explicit. Returns undefined if the input is not such a URL.
 */
export declare function getNormalisedOriginTuple(url: string):
    | {
          protocol: string;
          hostname: string;
          port: string;
      }
    | undefined;
