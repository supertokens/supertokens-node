import { APIFunction, APIInterface, APIOptions, UserWithFirstAndLastName } from "../../types";
import STError from "../../../../error";
import UserMetaDataRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";
import { getUser } from "../../../..";
import { User, UserContext } from "../../../../types";

type Response =
    | {
          status: "NO_USER_FOUND_ERROR";
      }
    | {
          status: "OK";
          user: UserWithFirstAndLastName;
      };

export const userGet: APIFunction = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    if (userId === undefined || userId === "") {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let user: User | undefined = await getUser(userId, userContext);

    if (user === undefined) {
        return {
            status: "NO_USER_FOUND_ERROR",
        };
    }

    try {
        UserMetaDataRecipe.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "OK",
            user: {
                ...user.toJson(),
                firstName: "FEATURE_NOT_ENABLED",
                lastName: "FEATURE_NOT_ENABLED",
            },
        };
    }

    const userMetaData = await UserMetaData.getUserMetadata(userId, userContext);
    const { first_name, last_name } = userMetaData.metadata;

    return {
        status: "OK",
        user: {
            ...user.toJson(),
            firstName: first_name === undefined ? "" : first_name,
            lastName: last_name === undefined ? "" : last_name,
        },
    };
};
