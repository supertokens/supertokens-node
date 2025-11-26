// @ts-nocheck
import { APIFunction, CoreConfigFieldInfo } from "../../types";
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
export default function getTenantInfo({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
