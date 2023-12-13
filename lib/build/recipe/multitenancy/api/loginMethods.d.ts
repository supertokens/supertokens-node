// @ts-nocheck
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
export default function loginMethodsAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
