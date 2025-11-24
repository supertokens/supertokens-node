// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { UserContext } from "../../types";
export type EmailDeliveryInterface<T> = {
    sendEmail: (
        input: T & {
            tenantId: string;
            userContext: UserContext;
        }
    ) => Promise<void>;
};
/**
 * config class parameter when parent Recipe create a new EmailDeliveryIngredient object via constructor
 */
export interface TypeInput<T> {
    service?: EmailDeliveryInterface<T>;
    override?: (
        originalImplementation: EmailDeliveryInterface<T>,
        builder: OverrideableBuilder<EmailDeliveryInterface<T>>
    ) => EmailDeliveryInterface<T>;
}
export interface TypeInputWithService<T> {
    service: EmailDeliveryInterface<T>;
    override?: (
        originalImplementation: EmailDeliveryInterface<T>,
        builder: OverrideableBuilder<EmailDeliveryInterface<T>>
    ) => EmailDeliveryInterface<T>;
}
