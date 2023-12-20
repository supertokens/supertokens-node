// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
declare type LoginMethod =
    | {
          methodType: "passwordless";
          contactMethod: "PHONE" | "EMAIL" | "EMAIL_OR_PHONE";
      }
    | {
          methodType: "emailPassword";
      };
declare type Response = {
    status: "OK";
    loginMethods: LoginMethod[];
};
export declare const getLoginMethodsInfo: (
    _: APIInterface,
    tenantId: string,
    ___: APIOptions,
    ____: any
) => Promise<Response>;
export {};
