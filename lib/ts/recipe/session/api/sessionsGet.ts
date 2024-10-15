/**
 * This defines the top-level handler for allSessionsGET type.
 */

import { send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import Session from "..";

export default async function sessionsGet(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext,
    tenantId: string
): Promise<boolean> {
    if (apiImplementation.allSessionsGET === undefined) {
        return false;
    }

    const session = await Session.getSession(options.req, options.res, {}, userContext);

    let result = await apiImplementation.allSessionsGET({
        session,
        options,
        tenantId,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
