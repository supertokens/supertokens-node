// @ts-nocheck
/**
 * This file contains the top-level handler definition for password update
 */
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
export default function updatePassword(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
