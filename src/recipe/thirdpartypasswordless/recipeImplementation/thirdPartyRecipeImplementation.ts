import { RecipeInterface, User } from '../../thirdparty/types'
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from '../types'

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
  return {
    async getUserByThirdPartyInfo(input: {
      thirdPartyId: string
      thirdPartyUserId: string
      userContext: any
    }): Promise<User | undefined> {
      const user = await recipeInterface.getUserByThirdPartyInfo(input)
      if (user === undefined || !('thirdParty' in user))
        return undefined

      return user
    },

    async signInUp(input: {
      thirdPartyId: string
      thirdPartyUserId: string
      email: string
      userContext: any
    }): Promise<{ status: 'OK'; createdNewUser: boolean; user: User }> {
      const result = await recipeInterface.thirdPartySignInUp(input)
      if (!('thirdParty' in result.user))
        throw new Error('Should never come here')

      return {
        status: 'OK',
        createdNewUser: result.createdNewUser,
        user: result.user,
      }
    },

    async getUserById(input: { userId: string; userContext: any }): Promise<User | undefined> {
      const user = await recipeInterface.getUserById(input)
      if (user === undefined || !('thirdParty' in user)) {
        // either user is undefined or it's an email password user.
        return undefined
      }
      return user
    },

    async getUsersByEmail(input: { email: string; userContext: any }): Promise<User[]> {
      const users = await recipeInterface.getUsersByEmail(input)

      // we filter out all non thirdparty users.
      return users.filter((u) => {
        return 'thirdParty' in u
      }) as User[]
    },
  }
}
