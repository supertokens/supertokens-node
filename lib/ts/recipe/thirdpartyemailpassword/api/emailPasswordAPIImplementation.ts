import { APIInterface } from "../../emailpassword";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    return {
        emailExistsGET: apiImplmentation.emailPasswordEmailExistsGET?.bind(apiImplmentation),
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST?.bind(apiImplmentation),
        passwordResetPOST: apiImplmentation.passwordResetPOST?.bind(apiImplmentation),
        signInPOST: apiImplmentation.emailPasswordSignInPOST?.bind(apiImplmentation),
        signUpPOST: apiImplmentation.emailPasswordSignUpPOST?.bind(apiImplmentation),
    };
}
