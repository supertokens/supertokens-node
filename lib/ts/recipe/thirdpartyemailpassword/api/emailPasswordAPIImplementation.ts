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
                : async (input) => {
                      let response = await signInUpPOST({
                          type: "emailpassword",
                          formFields: input.formFields,
                          options: input.options,
                          isSignIn: true,
                      });
                      if (response.status === "OK") {
                          return {
                              status: "OK",
                              user: response.user,
                          };
                      } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
                          return {
                              status: "WRONG_CREDENTIALS_ERROR",
                          };
                      } else {
                          throw Error("Should never come here");
                      }
                  },
        signUpPOST:
            signInUpPOST === undefined
                ? undefined
                : async (input) => {
                      let response = await signInUpPOST({
                          type: "emailpassword",
                          formFields: input.formFields,
                          options: input.options,
                          isSignIn: false,
                      });
                      if (response.status === "OK") {
                          return {
                              status: "OK",
                              user: response.user,
                          };
                      } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                          return {
                              status: "EMAIL_ALREADY_EXISTS_ERROR",
                          };
                      } else {
                          throw Error("Should never come here");
                      }
                  },
    };
}
