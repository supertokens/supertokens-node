import { APIInterface, APIOptions } from "../../types";
import PasswordlessRecipe from "../../../passwordless/recipe";
import EmailPasswordRecipe from "../../../emailpassword/recipe";
import Multitenancy from "../../../multitenancy";

type LoginMethod =
    | {
          methodType: "passwordless";
          contactMethod: "PHONE" | "EMAIL" | "EMAIL_OR_PHONE";
      }
    | {
          methodType: "emailPassword";
      };

type Response = {
    status: "OK";
    loginMethods: LoginMethod[];
};

export const getLoginMethodsInfo = async (
    _: APIInterface,
    tenantId: string,
    ___: APIOptions,
    ____: any
): Promise<Response> => {
    let passwordlessRecipe: PasswordlessRecipe | undefined = undefined;
    let emailPasswordRecipe: EmailPasswordRecipe | undefined = undefined;

    const loginMethods: LoginMethod[] = [];
    const tenantDetails = await Multitenancy.getTenant(tenantId);

    try {
        passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
    } catch (error) {}

    try {
        emailPasswordRecipe = EmailPasswordRecipe.getInstanceOrThrowError();
    } catch (error) {}

    //  this api should change change...
    if (tenantDetails === undefined) {
        if (passwordlessRecipe !== undefined) {
            loginMethods.push({
                methodType: "passwordless",
                contactMethod: passwordlessRecipe.config.contactMethod,
            });
        }

        if (emailPasswordRecipe !== undefined) {
            loginMethods.push({
                methodType: "emailPassword",
            });
        }
    } else {
        if (tenantDetails.emailPassword && emailPasswordRecipe !== undefined) {
            loginMethods.push({ methodType: "emailPassword" });
        }

        if (tenantDetails.passwordless && passwordlessRecipe !== undefined) {
            loginMethods.push({ methodType: "passwordless", contactMethod: passwordlessRecipe.config.contactMethod });
        }
    }

    return {
        status: "OK",
        loginMethods,
    };
};
