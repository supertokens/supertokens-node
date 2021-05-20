import { APIInterface, APIOptions } from "../";
import Recipe from "../recipe";
export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe);
    verifyEmailPOST: (
        token: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    isEmailVerifiedGET: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
    generateEmailVerifyTokenPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
