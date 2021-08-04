import { APIOptions } from "../types";
import { send200Response } from "../../../utils";
import STError from "../error";
import { APIInterface } from "../apiInterface";

export const getUsersByEmailAPI = async (api: APIInterface, options: APIOptions) => {
    if (api.usersByEmailGET === undefined) {
        return options.next();
    }

    const email = options.req.query["email"];

    if (email === undefined || typeof email !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide a single GET param 'email'",
        });
    }

    const response = await api.usersByEmailGET({ email, options });

    return send200Response(options.res, response);
};
