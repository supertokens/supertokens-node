// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response =
    | {
          status: "OK";
      }
    | undefined;
export default function validateKey(_: APIInterface, options: APIOptions): Promise<boolean>;
