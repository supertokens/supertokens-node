// @ts-nocheck
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
export default function emailVerify(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
