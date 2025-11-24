// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
type Response =
    | {
          status: "OK";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      };
export declare const userPasswordPut: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
) => Promise<Response>;
export {};
