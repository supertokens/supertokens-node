// @ts-nocheck
import { APIFunction } from "../../types";
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
export declare const userPut: ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<Response>;
export {};
