// @ts-nocheck
import type { APIInterface, APIOptions } from "../types";
import { UserContext } from "../../../types";
export default function emailExists(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
