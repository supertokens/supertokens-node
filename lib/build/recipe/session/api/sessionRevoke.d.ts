// @ts-nocheck
/**
 * Defines top-level handler for revoking a session using it's handle.
 */
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
export default function sessionRevoke(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean>;
