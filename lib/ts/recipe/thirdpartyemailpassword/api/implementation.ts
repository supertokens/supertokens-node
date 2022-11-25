import { APIInterface } from "../";
import EmailPasswordAPIImplementation from "../../emailpassword/api/implementation";
import ThirdPartyAPIImplementation from "../../thirdparty/api/implementation";
import DerivedEP from "./emailPasswordAPIImplementation";
import DerivedTP from "./thirdPartyAPIImplementation";

export default function getAPIImplementation(): APIInterface {
    let emailPasswordImplementation = EmailPasswordAPIImplementation();
    let thirdPartyImplementation = ThirdPartyAPIImplementation();
    return {
        emailPasswordEmailExistsGET: emailPasswordImplementation.emailExistsGET?.bind(DerivedEP(this)),
        authorisationUrlGET: thirdPartyImplementation.authorisationUrlGET?.bind(DerivedTP(this)),
        emailPasswordSignInPOST: emailPasswordImplementation.signInPOST?.bind(DerivedEP(this)),
        emailPasswordSignUpPOST: emailPasswordImplementation.signUpPOST?.bind(DerivedEP(this)),
        generatePasswordResetTokenPOST: emailPasswordImplementation.generatePasswordResetTokenPOST?.bind(
            DerivedEP(this)
        ),
        linkEmailPasswordAccountToExistingAccountPOST: emailPasswordImplementation.linkAccountToExistingAccountPOST?.bind(
            DerivedEP(this)
        ),
        passwordResetPOST: emailPasswordImplementation.passwordResetPOST?.bind(DerivedEP(this)),
        thirdPartySignInUpPOST: thirdPartyImplementation.signInUpPOST?.bind(DerivedTP(this)),
        appleRedirectHandlerPOST: thirdPartyImplementation.appleRedirectHandlerPOST?.bind(DerivedTP(this)),
    };
}
