import OpenIdRecipe from './recipe'

export default class OpenIdRecipeWrapper {
  static init = OpenIdRecipe.init

  static getOpenIdDiscoveryConfiguration(userContext?: any) {
    return OpenIdRecipe.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static createJWT(payload?: any, validitySeconds?: number, userContext?: any) {
    return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
      payload,
      validitySeconds,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static getJWKS(userContext?: any) {
    return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS({
      userContext: userContext === undefined ? {} : userContext,
    })
  }
}

export const init = OpenIdRecipeWrapper.init
export const getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration
export const createJWT = OpenIdRecipeWrapper.createJWT
export const getJWKS = OpenIdRecipeWrapper.getJWKS
