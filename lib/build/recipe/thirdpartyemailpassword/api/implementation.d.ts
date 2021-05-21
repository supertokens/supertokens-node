import { APIInterface, APIOptions, User, TypeProvider } from "../";
import Recipe from "../recipe";
import ThirdPartyRecipe from "../../thirdparty/recipe";
import EmailPasswordRecipe from "../../emailpassword/recipe";
import EmailPasswordImplemenation from "../../emailpassword/api/implementation";
import ThirdPartyImplemenation from "../../thirdparty/api/implementation";
export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation | undefined;
    emailPasswordRecipeInstance: EmailPasswordRecipe;
    thirdPartyRecipeInstance?: ThirdPartyRecipe;
    constructor(
        recipeInstance: Recipe,
        emailPasswordRecipeInstance: EmailPasswordRecipe,
        thirdPartyRecipeInstance?: ThirdPartyRecipe
    );
    emailExistsGET: (
        email: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
    generatePasswordResetTokenPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    passwordResetPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    signInPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
    }>;
    signUpPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
    }>;
    authorisationUrlGET: (
        provider: TypeProvider,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        url: string;
    }>;
    signInUpPOST: (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    signOutPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
