import { APIInterface } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.signInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : async (input) => {
                      let result = await signInUpPOSTFromThirdPartyEmailPassword({
                          type: "thirdparty",
                          code: input.code,
                          provider: input.provider,
                          redirectURI: input.redirectURI,
                          options: input.options,
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
