/**
 * Defines top-level handler for revoking a session using it's handle.
 */

import { send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import Session from "..";
import STError from "../../../error";

export default async function sessionRevoke(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.revokeSessionPOST === undefined) {
        return false;
    }

    let sessionHandle = options.req.getKeyValueFromQuery("sessionHandle");

    if (sessionHandle === undefined || typeof sessionHandle !== "string") {
        throw new STError({
            message: "Missing required parameter 'newPassword'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const session = await Session.getSession(options.req, options.res, {}, userContext);

    let result = await apiImplementation.revokeSessionPOST({
        sessionHandle,
        session,
        options,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
