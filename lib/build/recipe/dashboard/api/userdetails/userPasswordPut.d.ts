// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response =
    | {
          status: "OK";
      }
    | {
          status: "PROVIDE_RECIPE_USER_ID_AS_USER_ID_ERROR";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      };
export declare const userPasswordPut: (_: APIInterface, options: APIOptions) => Promise<Response>;
export {};
