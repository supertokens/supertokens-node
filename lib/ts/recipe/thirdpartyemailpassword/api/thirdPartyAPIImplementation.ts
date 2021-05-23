import { APIInterface, APIOptions, User, TypeProvider } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";
import STError from "../error";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    const signInUpPOST = apiImplmentation.signInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signOutPOST: undefined,
        signInUpPOST:
            signInUpPOST === undefined
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
                  }> => {
                      let result = await signInUpPOST(provider, code, redirectURI, options);
                      if (result.user.thirdParty === undefined) {
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
                  },
    };
}
