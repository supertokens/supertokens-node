import { APIInterface } from "../";
import EmailPasswordAPIImplementation from "../../emailpassword/api/implementation";
import ThirdPartyAPIImplementation from "../../thirdparty/api/implementation";

export default function getAPIImplementation(): APIInterface {
    let emailPasswordImplementation = EmailPasswordAPIImplementation();
    let thirdPartyImplementation = ThirdPartyAPIImplementation();
    return {
        emailExistsGET: emailPasswordImplementation.emailExistsGET,
        authorisationUrlGET: thirdPartyImplementation.authorisationUrlGET,
        emailPasswordSignInPOST: emailPasswordImplementation.signInPOST,
        emailPasswordSignUpPOST: emailPasswordImplementation.signUpPOST,
        generatePasswordResetTokenPOST: emailPasswordImplementation.generatePasswordResetTokenPOST,
        passwordResetPOST: emailPasswordImplementation.passwordResetPOST,
        thirdPartySignInUpPOST: thirdPartyImplementation.signInUpPOST,
    };
}
