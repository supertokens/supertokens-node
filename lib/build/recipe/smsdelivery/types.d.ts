// @ts-nocheck
export interface SmsService<TypeInput> {
    sendSms: (input: TypeInput, userContext: any) => Promise<void>;
}
export declare type RecipeInterface<TypeInput> = {
    sendSms: (input: TypeInput, userContext: any) => Promise<void>;
};
/**
 * input given by the user if SmsDelivery config is passed in parent Recipe
 */
export interface TypeConfigInput<TypeInput> {
    service: SmsService<TypeInput>;
    override?: (originalImplementation: RecipeInterface<TypeInput>) => RecipeInterface<TypeInput>;
}
/**
 * config class parameter when parent Recipe create a new SmsDeliveryRecipe object via constructor
 */
export interface ConfigInput<TypeInput> {
    service: SmsService<TypeInput>;
    recipeImpl: RecipeInterface<TypeInput>;
}
