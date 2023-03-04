import { RecipeInterface, User } from '../../thirdparty/types'
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from '../types'

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
  return {
    async getUserByThirdPartyInfo(input: {
      thirdPartyId: string
      thirdPartyUserId: string
      userContext: any
    }): Promise<User | undefined> {
      const user = await recipeInterface.getUserByThirdPartyInfo(input)
      if (user === undefined || user.thirdParty === undefined)
        return undefined

      return {
        email: user.email,
        id: user.id,
        timeJoined: user.timeJoined,
        thirdParty: user.thirdParty,
      }
    },

    async signInUp(input: {
      thirdPartyId: string
      thirdPartyUserId: string
      email: string
      userContext: any
    }): Promise<{ status: 'OK'; createdNewUser: boolean; user: User }> {
      const result = await recipeInterface.thirdPartySignInUp(input)
      if (result.user.thirdParty === undefined)
        throw new Error('Should never come here')

      return {
        status: 'OK',
        createdNewUser: result.createdNewUser,
        user: {
          email: result.user.email,
          id: result.user.id,
          timeJoined: result.user.timeJoined,
          thirdParty: result.user.thirdParty,
        },
      }
    },

    async getUserById(input: { userId: string; userContext: any }): Promise<User | undefined> {
      const user = await recipeInterface.getUserById(input)
      if (user === undefined || user.thirdParty === undefined) {
        // either user is undefined or it's an email password user.
        return undefined
      }
      return {
        email: user.email,
        id: user.id,
        timeJoined: user.timeJoined,
        thirdParty: user.thirdParty,
      }
    },

    async getUsersByEmail(input: { email: string; userContext: any }): Promise<User[]> {
      const users = await recipeInterface.getUsersByEmail(input)

      // we filter out all non thirdparty users.
      return users.filter((u) => {
        return u.thirdParty !== undefined
      }) as User[]
    },
  }
}
