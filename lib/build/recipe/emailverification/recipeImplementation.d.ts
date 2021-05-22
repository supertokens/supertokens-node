import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier);
    createEmailVerificationToken: (userId: string, email: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<User>;
    isEmailVerified: (userId: string, email: string) => Promise<any>;
}
