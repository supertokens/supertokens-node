// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
export declare type Response =
    | {
          status: "OK";
          didConfigExist: boolean;
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function deleteThirdPartyConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
