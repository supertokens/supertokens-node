// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "THIRD_PARTY_PROVIDER_DOES_NOT_EXIST" | "INVALID_SAML_METADATA_URL";
      }
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "BOXY_ERROR";
          message: string;
      };
export default function boxySamlUpload(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
