import { APIFunction } from "../../../types";

type Response =
    | {
          status: "OK";
          roles: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

const getAllRoles: APIFunction = async ({ stInstance, userContext }: Parameters<APIFunction>[0]): Promise<Response> => {
    let userrolesRecipe = undefined;
    try {
        userrolesRecipe = stInstance.getRecipeInstanceOrThrow("userroles");
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const response = await userrolesRecipe.recipeInterfaceImpl.getAllRoles({ userContext });
    return {
        status: "OK",
        roles: response.roles,
    };
};

export default getAllRoles;
