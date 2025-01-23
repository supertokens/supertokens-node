// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
type Response =
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
      }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          error: string;
      }
    | {
          status: "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR";
          error: string;
      };
export declare const userPut: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
) => Promise<Response>;
export {};
