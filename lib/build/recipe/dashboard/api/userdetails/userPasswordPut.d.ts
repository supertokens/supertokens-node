// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response =
    | {
          status: "OK";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      }
    | {
          status: "PASSWORD_POLICY_VIOLATED_ERROR";
          failureReason: string;
      };
export declare const userPasswordPut: (_: APIInterface, options: APIOptions) => Promise<Response>;
export {};
