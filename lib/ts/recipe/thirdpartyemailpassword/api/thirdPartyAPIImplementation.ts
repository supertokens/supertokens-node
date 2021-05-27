import { APIInterface, APIOptions, User, TypeProvider } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";
import STError from "../error";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.signInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signOutPOST: undefined,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : async (
                      provider: TypeProvider,
                      code: string,
                      redirectURI: string,
                      options: APIOptions
                  ): Promise<{
                      status: "OK";
                      createdNewUser: boolean;
                      user: User;
                      authCodeResponse: any;
                  }> => {
                      let result = await signInUpPOSTFromThirdPartyEmailPassword({
                          type: "thirdparty",
                          code,
                          provider,
                          redirectURI,
                          options,
                      });
                      if (result.status === "OK") {
                          if (result.user.thirdParty === undefined || result.type === "emailpassword") {
                              throw new STError({
                                  type: STError.GENERAL_ERROR,
                                  payload: new Error("Should never come here"),
                              });
                          }
                          return {
                              ...result,
                              user: {
                                  ...result.user,
                                  thirdParty: result.user.thirdParty,
                              },
                          };
                      } else {
                          throw Error("Should never come here");
                      }
                  },
    };
}
