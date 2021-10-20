import { APIInterface } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.thirdPartySignInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : async (input) => {
                      let result = await signInUpPOSTFromThirdPartyEmailPassword(input);
                      if (result.status === "OK") {
                          if (result.user.thirdParty === undefined) {
                              throw new Error("Should never come here");
                          }
                          return {
                              ...result,
                              user: {
                                  ...result.user,
                                  thirdParty: {
                                      ...result.user.thirdParty,
                                  },
                              },
                          };
                      }
                      return result;
                  },
    };
}
