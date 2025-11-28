// @ts-nocheck
import { APIFunction } from "../../types";
type Response =
    | {
          status: "OK";
      }
    | {
          status: "INVALID_PASSWORD_ERROR";
          error: string;
      };
export declare const userPasswordPut: ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<Response>;
export {};
