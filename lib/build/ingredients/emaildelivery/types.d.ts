// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
export declare type EmailDeliveryInterface<T> = {
    sendEmail: (
        input: T & {
            userContext: any;
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
