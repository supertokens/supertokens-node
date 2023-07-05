import SuperTokens from "../../../../supertokens";
import { APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";

type Response = {
    status: "OK";
};

export const userDelete = async (_: APIInterface, ___: string, options: APIOptions, __: any): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    if (userId === undefined) {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    await SuperTokens.getInstanceOrThrowError().deleteUser({
        userId,
    });

    return {
        status: "OK",
    };
};
