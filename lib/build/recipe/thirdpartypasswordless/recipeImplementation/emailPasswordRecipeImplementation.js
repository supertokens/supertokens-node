"use strict";
// import { RecipeInterface, User } from "../../emailpassword/types";
// import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
// export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
//     return {
//         signUp: async function (input: {
//             email: string;
//             password: string;
//             userContext: any;
//         }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
//             return await recipeInterface.signUp(input);
//         },
//         signIn: async function (input: {
//             email: string;
//             password: string;
//             userContext: any;
//         }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
//             return recipeInterface.signIn(input);
//         },
//         getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
//             let user = await recipeInterface.getUserById(input);
//             if (user === undefined || user.thirdParty !== undefined) {
//                 // either user is undefined or it's a thirdparty user.
//                 return undefined;
//             }
//             return user;
//         },
//         getUserByEmail: async function (input: { email: string; userContext: any }): Promise<User | undefined> {
//             let result = await recipeInterface.getUsersByEmail(input);
//             for (let i = 0; i < result.length; i++) {
//                 if (result[i].thirdParty === undefined) {
//                     return result[i];
//                 }
//             }
//             return undefined;
//         },
//         createResetPasswordToken: async function (input: {
//             userId: string;
//             userContext: any;
//         }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
//             return recipeInterface.createResetPasswordToken(input);
//         },
//         resetPasswordUsingToken: async function (input: { token: string; newPassword: string; userContext: any }) {
//             return recipeInterface.resetPasswordUsingToken(input);
//         },
//         updateEmailOrPassword: async function (input: {
//             userId: string;
//             email?: string;
//             password?: string;
//             userContext: any;
//         }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> {
//             return recipeInterface.updateEmailOrPassword(input);
//         },
//     };
// }
