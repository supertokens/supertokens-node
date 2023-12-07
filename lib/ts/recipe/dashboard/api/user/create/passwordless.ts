// import { APIInterface, APIOptions } from "../../../types";
// // import STError from "../../../../../error";
// import Passwordless from "../../../../passwordless"
// import PasswordlessRecipe from "../../../../passwordless/recipe"
// import { User } from "../../../../../types";
// import RecipeUserId from "../../../../../recipeUserId";

// type Response =  {
//     status: "OK";
//     createdNewRecipeUser: boolean;
//     user: User;
//     recipeUserId: RecipeUserId;
// } | {
//     status:"FEATURE_NOT_ENABLED_ERROR"
// } | string

// export const createThridPartyUser = async (_: APIInterface, tenantId: string, options: APIOptions, __: any): Promise<Response> => {
//     try {
//         PasswordlessRecipe.getInstanceOrThrowError()
//     } catch (error) {
//         return {
//             status: "FEATURE_NOT_ENABLED_ERROR",
//         };
//     }

//     const requestBody = await options.req.getJSONBody();

//     // const response = await Passwordless.consumeCode(tenantId)

//     return ""
// };
