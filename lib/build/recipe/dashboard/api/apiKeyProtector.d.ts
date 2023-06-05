// @ts-nocheck
import { APIFunction, APIInterface, APIOptions } from "../types";
export default function apiKeyProtector(
    apiImplementation: APIInterface,
    options: APIOptions,
    apiFunction: APIFunction
): Promise<boolean>;
