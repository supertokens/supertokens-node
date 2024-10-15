/**
 * This file contains the top-level handler definition for password update
 */

import { send200Response } from "../../../utils";
import STError from "../error";
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import Session from "../../session";

export default async function updatePassword(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.updatePasswordPOST === undefined) {
        return false;
    }

    const { newPassword, oldPassword } = await options.req.getJSONBody();

    if (newPassword === undefined) {
        throw new STError({
            message: "Missing required parameter 'newPassword'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (oldPassword === undefined) {
        throw new STError({
            message: "Missing required parameter 'oldPassword'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const session = await Session.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [] },
        userContext
    );

    let result = await apiImplementation.updatePasswordPOST({
        newPassword,
        oldPassword,
        session,
        options,
        userContext,
        tenantId,
    });

    send200Response(options.res, result);
    return true;
}
