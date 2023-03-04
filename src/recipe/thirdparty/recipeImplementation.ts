import { Querier } from '../../querier'
import NormalisedURLPath from '../../normalisedURLPath'
import { RecipeInterface, User } from './types'

export default function getRecipeImplementation(querier: Querier): RecipeInterface {
  return {
    async signInUp({
      thirdPartyId,
            thirdPartyUserId,
            email,
    }: {
      thirdPartyId: string
      thirdPartyUserId: string
      email: string
    }): Promise<{ status: 'OK'; createdNewUser: boolean; user: User }> {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/signinup'), {
        thirdPartyId,
        thirdPartyUserId,
        email: { id: email },
      })
      return {
        status: 'OK',
        createdNewUser: response.createdNewUser,
        user: response.user,
      }
    },

    async getUserById({ userId }: { userId: string }): Promise<User | undefined> {
      const response = await querier.sendGetRequest(new NormalisedURLPath('/recipe/user'), {
        userId,
      })
      if (response.status === 'OK') {
        return {
          ...response.user,
        }
      }
      else {
        return undefined
      }
    },

    async getUsersByEmail({ email }: { email: string }): Promise<User[]> {
      const { users } = await querier.sendGetRequest(new NormalisedURLPath('/recipe/users/by-email'), {
        email,
      })

      return users
    },

    async getUserByThirdPartyInfo({
      thirdPartyId,
            thirdPartyUserId,
    }: {
      thirdPartyId: string
      thirdPartyUserId: string
    }): Promise<User | undefined> {
      const response = await querier.sendGetRequest(new NormalisedURLPath('/recipe/user'), {
        thirdPartyId,
        thirdPartyUserId,
      })
      if (response.status === 'OK') {
        return {
          ...response.user,
        }
      }
      else {
        return undefined
      }
    },
  }
}
