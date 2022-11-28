import { APIInterface } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.thirdPartySignInUpPOST?.bind(apiImplmentation);
    const linkThirdPartyAccountToExistingAccountPOST = apiImplmentation.linkThirdPartyAccountToExistingAccountPOST?.bind(
        apiImplmentation
    );
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET?.bind(apiImplmentation),
        appleRedirectHandlerPOST: apiImplmentation.appleRedirectHandlerPOST?.bind(apiImplmentation),
        linkAccountToExistingAccountPOST:
            linkThirdPartyAccountToExistingAccountPOST === undefined
                ? undefined
                : async function (input) {
                      let result = await linkThirdPartyAccountToExistingAccountPOST(input);
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
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : async function (input) {
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
