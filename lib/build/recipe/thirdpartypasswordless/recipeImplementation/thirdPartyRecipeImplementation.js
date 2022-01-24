"use strict";
// import { RecipeInterface, User } from "../../thirdparty/types";
// import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
// export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
//     return {
//         getUserByThirdPartyInfo: async function (input: {
//             thirdPartyId: string;
//             thirdPartyUserId: string;
//             userContext: any;
//         }): Promise<User | undefined> {
//             let user = await recipeInterface.getUserByThirdPartyInfo(input);
//             if (user === undefined || user.thirdParty === undefined) {
//                 return undefined;
//             }
//             return {
//                 email: user.email,
//                 id: user.id,
//                 timeJoined: user.timeJoined,
//                 thirdParty: user.thirdParty,
//             };
//         },
//         signInUp: async function (input: {
//             thirdPartyId: string;
//             thirdPartyUserId: string;
//             email: {
//                 id: string;
//                 isVerified: boolean;
//             };
//             userContext: any;
//         }): Promise<
//             | { status: "OK"; createdNewUser: boolean; user: User }
//             | {
//                   status: "FIELD_ERROR";
//                   error: string;
//               }
//         > {
//             let result = await recipeInterface.signInUp(input);
//             if (result.status === "FIELD_ERROR") {
//                 return result;
//             }
//             if (result.user.thirdParty === undefined) {
//                 throw new Error("Should never come here");
//             }
//             return {
//                 status: "OK",
//                 createdNewUser: result.createdNewUser,
//                 user: {
//                     email: result.user.email,
//                     id: result.user.id,
//                     timeJoined: result.user.timeJoined,
//                     thirdParty: result.user.thirdParty,
//                 },
//             };
//         },
//         getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
//             let user = await recipeInterface.getUserById(input);
//             if (user === undefined || user.thirdParty === undefined) {
//                 // either user is undefined or it's an email password user.
//                 return undefined;
//             }
//             return {
//                 email: user.email,
//                 id: user.id,
//                 timeJoined: user.timeJoined,
//                 thirdParty: user.thirdParty,
//             };
//         },
//         getUsersByEmail: async function (input: { email: string; userContext: any }): Promise<User[]> {
//             let users = await recipeInterface.getUsersByEmail(input);
//             // we filter out all non thirdparty users.
//             return users.filter((u) => {
//                 return u.thirdParty !== undefined;
//             }) as User[];
//         },
//     };
// }
