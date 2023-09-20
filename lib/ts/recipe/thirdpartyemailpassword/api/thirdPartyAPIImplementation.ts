import { APIInterface } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET?.bind(apiImplmentation),
        appleRedirectHandlerPOST: apiImplmentation.appleRedirectHandlerPOST?.bind(apiImplmentation),
        signInUpPOST: apiImplmentation.thirdPartySignInUpPOST?.bind(apiImplmentation),
    };
}
