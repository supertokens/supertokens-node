import { APIInterface, APIOptions, TypeProvider } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.signInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signOutPOST: undefined,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : async (provider: TypeProvider, code: string, redirectURI: string, options: APIOptions) => {
                      let result = await signInUpPOSTFromThirdPartyEmailPassword({
                          type: "thirdparty",
                          code,
                          provider,
                          redirectURI,
                          options,
                      });
                      if (result.status === "OK") {
                          if (result.user.thirdParty === undefined || result.type === "emailpassword") {
                              throw Error("Should never come here");
                          }
                          return {
                              ...result,
                              user: {
                                  ...result.user,
                                  thirdParty: result.user.thirdParty,
                              },
                          };
                      } else if (result.status === "NO_EMAIL_GIVEN_BY_PROVIDER") {
                          return {
                              status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                          };
                      } else if (result.status === "FIELD_ERROR") {
                          return {
                              status: "FIELD_ERROR",
                              error: result.error,
                          };
                      } else {
                          throw Error("Should never come here");
                      }
                  },
    };
}
