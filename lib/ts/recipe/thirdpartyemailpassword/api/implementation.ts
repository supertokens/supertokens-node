import { APIInterface } from "../";
import EmailPasswordAPIImplementation from "../../emailpassword/api/implementation";
import ThirdPartyAPIImplementation from "../../thirdparty/api/implementation";

export default function getAPIImplementation(): APIInterface {
    let emailPasswordImplementation = EmailPasswordAPIImplementation();
    let thirdPartyImplementation = ThirdPartyAPIImplementation();
    return {
        emailExistsGET: emailPasswordImplementation.emailExistsGET?.bind(emailPasswordImplementation),
        authorisationUrlGET: thirdPartyImplementation.authorisationUrlGET?.bind(thirdPartyImplementation),
        emailPasswordSignInPOST: emailPasswordImplementation.signInPOST?.bind(emailPasswordImplementation),
        emailPasswordSignUpPOST: emailPasswordImplementation.signUpPOST?.bind(emailPasswordImplementation),
        generatePasswordResetTokenPOST: emailPasswordImplementation.generatePasswordResetTokenPOST?.bind(
            emailPasswordImplementation
        ),
        passwordResetPOST: emailPasswordImplementation.passwordResetPOST?.bind(emailPasswordImplementation),
        thirdPartySignInUpPOST: thirdPartyImplementation.signInUpPOST?.bind(thirdPartyImplementation),
    };
}
