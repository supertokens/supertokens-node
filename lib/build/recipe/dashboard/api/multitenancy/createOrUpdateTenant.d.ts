// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "INVALID_TENANT_ID";
      };
export default function createOrUpdateTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
