// @ts-nocheck
import { UserContext } from "../../../types";
import { APIFunction, APIInterface, APIOptions } from "../types";
export default function apiKeyProtector(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    apiFunction: APIFunction,
    userContext: UserContext
): Promise<boolean>;
