// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
export declare type SmsDeliveryInterface<T> = {
    sendSms: (
        input: T & {
            userContext: any;
        }
    ) => Promise<void>;
};
/**
 * config class parameter when parent Recipe create a new SmsDeliveryIngredient object via constructor
 */
export interface TypeInput<T> {
    service?: SmsDeliveryInterface<T>;
    override?: (
        originalImplementation: SmsDeliveryInterface<T>,
        builder: OverrideableBuilder<SmsDeliveryInterface<T>>
    ) => SmsDeliveryInterface<T>;
}
export interface TypeInputWithService<T> {
    service: SmsDeliveryInterface<T>;
    override?: (
        originalImplementation: SmsDeliveryInterface<T>,
        builder: OverrideableBuilder<SmsDeliveryInterface<T>>
    ) => SmsDeliveryInterface<T>;
}
