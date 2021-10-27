import { APIInterface } from "../../emailpassword";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyEmailPasswordAPIInterface): APIInterface {
    return {
        emailExistsGET: apiImplmentation.emailExistsGET,
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST,
        passwordResetPOST: apiImplmentation.passwordResetPOST,
        signInPOST: apiImplmentation.emailPasswordSignInPOST,
        signUpPOST: apiImplmentation.emailPasswordSignUpPOST,
    };
}
