import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import { deleteUser } from "../../../..";

type Response = {
    status: "OK";
};

export const userDelete = async (_: APIInterface, ___: string, options: APIOptions, __: any): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");
    let removeAllLinkedAccountsQueryValue = options.req.getKeyValueFromQuery("removeAllLinkedAccounts");
    if (removeAllLinkedAccountsQueryValue !== undefined) {
        removeAllLinkedAccountsQueryValue = removeAllLinkedAccountsQueryValue.trim().toLowerCase();
    }
    const removeAllLinkedAccounts =
        removeAllLinkedAccountsQueryValue === undefined ? undefined : removeAllLinkedAccountsQueryValue === "true";

    if (userId === undefined) {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    await deleteUser(userId, removeAllLinkedAccounts);

    return {
        status: "OK",
    };
};
