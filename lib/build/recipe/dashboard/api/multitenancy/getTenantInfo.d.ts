// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "OK";
          tenant: {
              tenantId: string;
              thirdParty: {
                  providers: {
                      thirdPartyId: string;
                      name: string;
                  }[];
              };
              firstFactors: string[];
              requiredSecondaryFactors?: string[] | null;
              coreConfig: any[];
              userCount: number;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function getTenantInfo(
    _: APIInterface,
    tenantId: string,
    __: APIOptions,
    userContext: any
): Promise<Response>;
