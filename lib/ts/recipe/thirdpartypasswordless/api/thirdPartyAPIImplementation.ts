import { APIInterface } from "../../thirdparty";
import { APIInterface as ThirdPartyPasswordlessAPIInterface } from "../types";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyPasswordlessAPIInterface): APIInterface {
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET?.bind(apiImplmentation),
        appleRedirectHandlerPOST: apiImplmentation.appleRedirectHandlerPOST?.bind(apiImplmentation),
        linkAccountWithUserFromSessionPOST: apiImplmentation.linkThirdPartyAccountWithUserFromSessionPOST?.bind(
            apiImplmentation
        ),
        signInUpPOST: apiImplmentation.thirdPartySignInUpPOST?.bind(apiImplmentation),
    };
}
