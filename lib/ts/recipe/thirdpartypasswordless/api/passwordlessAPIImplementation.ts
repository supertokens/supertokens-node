import { APIInterface } from "../../passwordless";
import { APIInterface as ThirdPartyPasswordlessAPIInterface } from "../types";

export default function getIterfaceImpl(apiImplmentation: ThirdPartyPasswordlessAPIInterface): APIInterface {
    return {
        emailExistsGET: apiImplmentation.passwordlessUserEmailExistsGET?.bind(apiImplmentation),
        consumeCodePOST: apiImplmentation.consumeCodePOST?.bind(apiImplmentation),
        createCodePOST: apiImplmentation.createCodePOST?.bind(apiImplmentation),
        phoneNumberExistsGET: apiImplmentation.passwordlessUserPhoneNumberExistsGET?.bind(apiImplmentation),
        resendCodePOST: apiImplmentation.resendCodePOST?.bind(apiImplmentation),
        linkAccountToExistingAccountPOST: apiImplmentation.linkPasswordlessAccountToExistingAccountPOST?.bind(
            apiImplmentation
        ),
    };
}
