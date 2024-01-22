// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "INVALID_PROVIDER_CONFIG";
          message: string;
      };
export default function createOrUpdateThirdPartyConfig(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
