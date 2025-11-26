// @ts-nocheck
import { APIFunction } from "../../types";
import { ProviderConfig } from "../../../thirdparty/types";
export type Response =
    | {
          status: "OK";
          providerConfig: ProviderConfig & {
              isGetAuthorisationRedirectUrlOverridden: boolean;
              isExchangeAuthCodeForOAuthTokensOverridden: boolean;
              isGetUserInfoOverridden: boolean;
          };
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function getThirdPartyConfig({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
