import { APIInterface } from "../types";
import PasswordlessAPIImplementation from "../../passwordless/api/implementation";
import ThirdPartyAPIImplementation from "../../thirdparty/api/implementation";
import DerivedPwdless from "./passwordlessAPIImplementation";
import DerivedTP from "./thirdPartyAPIImplementation";

export default function getAPIImplementation(): APIInterface {
    let passwordlessImplementation = PasswordlessAPIImplementation();
    let thirdPartyImplementation = ThirdPartyAPIImplementation();
    return {
        consumeCodePOST: passwordlessImplementation.consumeCodePOST?.bind(DerivedPwdless(this)),
        createCodePOST: passwordlessImplementation.createCodePOST?.bind(DerivedPwdless(this)),
        passwordlessUserEmailExistsGET: passwordlessImplementation.emailExistsGET?.bind(DerivedPwdless(this)),
        passwordlessUserPhoneNumberExistsGET: passwordlessImplementation.phoneNumberExistsGET?.bind(
            DerivedPwdless(this)
        ),
        linkThirdPartyAccountWithUserFromSessionPOST: thirdPartyImplementation.linkAccountWithUserFromSessionPOST?.bind(
            DerivedTP(this)
        ),
        resendCodePOST: passwordlessImplementation.resendCodePOST?.bind(DerivedPwdless(this)),
        authorisationUrlGET: thirdPartyImplementation.authorisationUrlGET?.bind(DerivedTP(this)),
        thirdPartySignInUpPOST: thirdPartyImplementation.signInUpPOST?.bind(DerivedTP(this)),
        appleRedirectHandlerPOST: thirdPartyImplementation.appleRedirectHandlerPOST?.bind(DerivedTP(this)),
        linkPasswordlessAccountWithUserFromSessionPOST: passwordlessImplementation.linkAccountWithUserFromSessionPOST?.bind(
            DerivedPwdless(this)
        ),
    };
}
