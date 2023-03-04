import { RecipeInterface, User } from '../../emailpassword/types'
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from '../types'

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
  return {
    async signUp(input: {
      email: string
      password: string
      userContext: any
    }): Promise<{ status: 'OK'; user: User } | { status: 'EMAIL_ALREADY_EXISTS_ERROR' }> {
      return await recipeInterface.emailPasswordSignUp(input)
    },

    async signIn(input: {
      email: string
      password: string
      userContext: any
    }): Promise<{ status: 'OK'; user: User } | { status: 'WRONG_CREDENTIALS_ERROR' }> {
      return recipeInterface.emailPasswordSignIn(input)
    },

    async getUserById(input: { userId: string; userContext: any }): Promise<User | undefined> {
      const user = await recipeInterface.getUserById(input)
      if (user === undefined || user.thirdParty !== undefined) {
        // either user is undefined or it's a thirdparty user.
        return undefined
      }
      return user
    },

    async getUserByEmail(input: { email: string; userContext: any }): Promise<User | undefined> {
      const result = await recipeInterface.getUsersByEmail(input)
      for (let i = 0; i < result.length; i++) {
        if (result[i].thirdParty === undefined)
          return result[i]
      }
      return undefined
    },

    async createResetPasswordToken(input: {
      userId: string
      userContext: any
    }): Promise<{ status: 'OK'; token: string } | { status: 'UNKNOWN_USER_ID_ERROR' }> {
      return recipeInterface.createResetPasswordToken(input)
    },

    async resetPasswordUsingToken(input: { token: string; newPassword: string; userContext: any }) {
      return recipeInterface.resetPasswordUsingToken(input)
    },

    async updateEmailOrPassword(input: {
      userId: string
      email?: string
      password?: string
      userContext: any
    }): Promise<{ status: 'OK' | 'UNKNOWN_USER_ID_ERROR' | 'EMAIL_ALREADY_EXISTS_ERROR' }> {
      return recipeInterface.updateEmailOrPassword(input)
    },
  }
}
