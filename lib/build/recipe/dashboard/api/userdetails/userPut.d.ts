// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response =
    | {
          status: "OK";
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_EMAIL_ERROR";
          error: string;
      }
    | {
          status: "PHONE_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_PHONE_ERROR";
          error: string;
      };
export declare const userPut: (_: APIInterface, options: APIOptions) => Promise<Response>;
export {};
