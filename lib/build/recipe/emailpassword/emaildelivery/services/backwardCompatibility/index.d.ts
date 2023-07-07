// @ts-nocheck
import { TypeEmailPasswordEmailDeliveryInput, RecipeInterface } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private recipeInterfaceImpl;
    private isInServerlessEnv;
    private appInfo;
    constructor(recipeInterfaceImpl: RecipeInterface, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeEmailPasswordEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
