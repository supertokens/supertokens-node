// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { ProviderConfig } from "../../../thirdparty/types";
import { UserContext } from "../../../../types";
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
export default function getThirdPartyConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
