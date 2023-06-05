import { TypeThirdPartyEmailPasswordEmailDeliveryInput } from "../../../types";
import { RecipeInterface as EmailPasswordRecipeInterface } from "../../../../emailpassword";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService;
    constructor(
        emailPasswordRecipeInterfaceImpl: EmailPasswordRecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean
    );
    sendEmail: (
        input: TypeThirdPartyEmailPasswordEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
