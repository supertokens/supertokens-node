// @ts-nocheck
import { APIInterface, APIOptions, CoreConfigFieldInfo } from "../../types";
import { UserContext } from "../../../../types";
export type Response =
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
              coreConfig: CoreConfigFieldInfo[];
              userCount: number;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function getTenantInfo(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
