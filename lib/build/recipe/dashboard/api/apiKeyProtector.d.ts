// @ts-nocheck
import { APIFunction, APIInterface, APIOptions } from "../types";
import { APIResponse } from "./types";
export default function apiKeyProtector(
    apiImplementation: APIInterface,
    options: APIOptions,
    apiFunction: APIFunction
): Promise<APIResponse>;
