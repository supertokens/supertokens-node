// @ts-nocheck
/**
 * This defines the top-level handler for allSessionsGET type.
 */
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
export default function sessionsGet(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext,
    tenantId: string
): Promise<boolean>;
