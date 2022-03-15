// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
export interface EmailService<T> {
    sendEmail: (
        input: T & {
            userContext: any;
        }
    ) => Promise<void>;
}
export declare type IngredientInterface<T> = {
    sendEmail: (
        input: T & {
            userContext: any;
        }
    ) => Promise<void>;
};
/**
 * config class parameter when parent Recipe create a new EmailDeliveryRecipe object via constructor
 */
export interface TypeInput<T> {
    service: EmailService<T>;
    override?: (
        originalImplementation: IngredientInterface<T>,
        builder: OverrideableBuilder<IngredientInterface<T>>
    ) => IngredientInterface<T>;
}
