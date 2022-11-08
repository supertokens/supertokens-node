import { APIFunction, APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import { isValidRecipeId } from "../../utils";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import ThirdPartyRecipe from "../../../thirdparty/recipe";
import PasswordlessRecipe from "../../../passwordless/recipe";
import EmailPassword from "../../../emailpassword";
import ThirdParty from "../../../thirdparty";
import Passwordless from "../../../passwordless";
import ThirdPartyEmailPassword from "../../../thirdpartyemailpassword";
import ThirdPartyPasswordless from "../../../thirdpartypasswordless";
import UserMetaDataRecipe from "../../../usermetadata/recipe";
import UserMetaData from "../../../usermetadata";

type CommonUserInformation = {
    id: string;
    timeJoined: number;
    firstName: string;
    lastName: string;
};

export type EmailPasswordUser = CommonUserInformation & {
    email: string;
};

export type ThirdPartyUser = CommonUserInformation & {
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
};

export type PasswordlessUser = CommonUserInformation & {
    email?: string;
    phone?: string;
};

type Response =
    | {
          status: "NO_USER_FOUND_ERROR";
      }
    | {
          status: "OK";
          recipeId: "emailpassword";
          user: EmailPasswordUser;
      }
    | {
          status: "OK";
          recipeId: "thirdparty";
          user: ThirdPartyUser;
      }
    | {
          status: "OK";
          recipeId: "passwordless";
          user: PasswordlessUser;
      };

export async function getUserForRecipeId(
    userId: string,
    recipeId: string
): Promise<{
    user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}> {
    let user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined;
    let recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;

    if (recipeId === EmailPasswordRecipe.RECIPE_ID) {
        try {
            const userResponse = await EmailPassword.getUserById(userId);

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    firstName: "",
                    lastName: "",
                };
                recipe = "emailpassword";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyEmailPassword.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartyemailpassword";
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === ThirdPartyRecipe.RECIPE_ID) {
        try {
            const userResponse = await ThirdParty.getUserById(userId);

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    firstName: "",
                    lastName: "",
                };
                recipe = "thirdparty";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyEmailPassword.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartyemailpassword";
                }
            } catch (e) {
                // No - op
            }
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyPasswordless.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartypasswordless";
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === PasswordlessRecipe.RECIPE_ID) {
        try {
            const userResponse = await Passwordless.getUserById({
                userId,
            });

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    firstName: "",
                    lastName: "",
                };
                recipe = "passwordless";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyPasswordless.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        firstName: "",
                        lastName: "",
                    };
                    recipe = "thirdpartypasswordless";
                }
            } catch (e) {
                // No - op
            }
        }
    }

    return {
        user,
        recipe,
    };
}

export const userGet: APIFunction = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");
    const recipeId = options.req.getKeyValueFromQuery("recipeId");

    if (userId === undefined) {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (recipeId === undefined) {
        throw new STError({
            message: "Missing required parameter 'recipeId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (!isValidRecipeId(recipeId)) {
        throw new STError({
            message: "Invalid recipe id",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined = (
        await getUserForRecipeId(userId, recipeId)
    ).user;

    if (user === undefined) {
        return {
            status: "NO_USER_FOUND_ERROR",
        };
    }

    try {
        UserMetaDataRecipe.getInstanceOrThrowError();
    } catch (_) {
        user = {
            ...user,
            firstName: "FEATURE_NOT_ENABLED",
            lastName: "FEATURE_NOT_ENABLED",
        };

        return {
            status: "OK",
            recipeId: recipeId as any,
            user,
        };
    }

    const userMetaData = await UserMetaData.getUserMetadata(userId);
    const { first_name, last_name } = userMetaData.metadata;

    user = {
        ...user,
        firstName: first_name === undefined ? "" : first_name,
        lastName: last_name === undefined ? "" : last_name,
    };

    return {
        status: "OK",
        recipeId: recipeId as any,
        user,
    };
};
