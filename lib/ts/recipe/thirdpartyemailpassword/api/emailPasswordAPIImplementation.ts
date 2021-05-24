import { APIInterface } from "../../emailpassword";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOST = apiImplmentation.signInUpPOST;
    return {
        emailExistsGET: apiImplmentation.emailExistsGET,
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST,
        passwordResetPOST: apiImplmentation.passwordResetPOST,
        signInPOST:
            signInUpPOST === undefined
                ? undefined
                : async (formFields, options) => {
                      return await signInUpPOST({
                          type: "emailpassword",
                          formFields,
                          options,
                          isSignIn: true,
                      });
                  },
        signOutPOST: apiImplmentation.signOutPOST,
        signUpPOST:
            signInUpPOST === undefined
                ? undefined
                : async (formFields, options) => {
                      return await signInUpPOST({
                          type: "emailpassword",
                          formFields,
                          options,
                          isSignIn: false,
                      });
                  },
    };
}
