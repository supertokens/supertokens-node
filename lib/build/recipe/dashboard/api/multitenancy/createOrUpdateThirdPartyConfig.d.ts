// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "INVALID_PROVIDER_CONFIG";
      };
export default function createOrUpdateThirdPartyConfig(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
