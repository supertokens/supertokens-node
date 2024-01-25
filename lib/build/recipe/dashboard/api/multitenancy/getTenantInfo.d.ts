// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { ProviderConfig } from "../../../thirdparty/types";
export declare type Response =
    | {
          status: "OK";
          tenant: {
              tenantId: string;
              emailPassword: {
                  enabled: boolean;
              };
              thirdParty: {
                  enabled: boolean;
                  providers: ProviderConfig[];
              };
              passwordless: {
                  enabled: boolean;
              };
              coreConfig: Record<string, unknown>;
              userCount: number;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function getTenantInfo(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
