import { APIInterface, APIOptions, User, TypeProvider } from "../";
import STError from "../error";
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
    ) {
        this.recipeInstance = recipeInstance;
        this.emailPasswordRecipeInstance = emailPasswordRecipeInstance;
        this.thirdPartyRecipeInstance = thirdPartyRecipeInstance;
        this.emailPasswordImplementation = new EmailPasswordImplemenation(emailPasswordRecipeInstance);
        if (thirdPartyRecipeInstance !== undefined) {
            this.thirdPartyImplementation = new ThirdPartyImplemenation(thirdPartyRecipeInstance);
        }
    }

    emailExistsGET = async (
        email: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        exists: boolean;
    }> => {
        return this.emailPasswordImplementation.emailExistsGET(email, {
            ...options,
            recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
        });
    };

    generatePasswordResetTokenPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.generatePasswordResetTokenPOST(formFields, {
            ...options,
            recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
        });
    };

    passwordResetPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.passwordResetPOST(formFields, token, {
            ...options,
            recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
        });
    };

    signInPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        return this.emailPasswordImplementation.signInPOST(formFields, {
            ...options,
            recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
        });
    };

    signUpPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        return this.emailPasswordImplementation.signUpPOST(formFields, {
            ...options,
            recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
        });
    };

    authorisationUrlGET = async (
        provider: TypeProvider,
        options: APIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }> => {
        if (this.thirdPartyImplementation === undefined || this.thirdPartyRecipeInstance === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("No thirdparty provider configured"),
            });
        }
        return this.thirdPartyImplementation.authorisationUrlGET(provider, {
            ...options,
            recipeImplementation: this.thirdPartyRecipeInstance.recipeInterfaceImpl,
        });
    };

    signInUpPOST = async (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }> => {
        if (this.thirdPartyImplementation === undefined || this.thirdPartyRecipeInstance === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("No thirdparty provider configured"),
            });
        }
        return this.thirdPartyImplementation.signInUpPOST(provider, code, redirectURI, {
            ...options,
            recipeImplementation: this.thirdPartyRecipeInstance.recipeInterfaceImpl,
        });
    };

    signOutPOST = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.signOutPOST({
            ...options,
            recipeImplementation: this.emailPasswordRecipeInstance.recipeInterfaceImpl,
        });
    };
}
