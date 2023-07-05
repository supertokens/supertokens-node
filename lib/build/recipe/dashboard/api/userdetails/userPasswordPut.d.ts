// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response =
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
    userContext: any
) => Promise<Response>;
export {};
