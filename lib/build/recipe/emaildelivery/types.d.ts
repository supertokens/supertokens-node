// @ts-nocheck
export interface EmailService<T> {
    sendEmail: (input: T, userConext: any) => Promise<void>;
}
export declare type RecipeInterface<T> = {
    sendEmail: (input: T, userContext: any) => Promise<void>;
};
/**
 * input given by the user if emailDelivery config is passed in parent Recipe
 */
export interface TypeConfigInput<T> {
    service: EmailService<T>;
    override?: (originalImplementation: RecipeInterface<T>) => RecipeInterface<T>;
}
/**
 * config class parameter when parent Recipe create a new EmailDeliveryRecipe object via constructor
 */
export interface ConfigInput<T> {
    service: EmailService<T>;
    recipeImpl: RecipeInterface<T>;
}
