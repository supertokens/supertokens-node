import { RecipeInterface, User } from '../types'
import PasswordlessImplemenation from '../../passwordless/recipeImplementation'

import ThirdPartyImplemenation from '../../thirdparty/recipeImplementation'
import { RecipeInterface as ThirdPartyRecipeInterface } from '../../thirdparty'
import { Querier } from '../../../querier'
import DerivedPwdless from './passwordlessRecipeImplementation'
import DerivedTP from './thirdPartyRecipeImplementation'

export default function getRecipeInterface(passwordlessQuerier: Querier, thirdPartyQuerier?: Querier): RecipeInterface {
  const originalPasswordlessImplementation = PasswordlessImplemenation(passwordlessQuerier)
  let originalThirdPartyImplementation: undefined | ThirdPartyRecipeInterface
  if (thirdPartyQuerier !== undefined)
    originalThirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier)

  return {
    async consumeCode(input) {
      return originalPasswordlessImplementation.consumeCode.bind(DerivedPwdless(this))(input)
    },
    async createCode(input) {
      return originalPasswordlessImplementation.createCode.bind(DerivedPwdless(this))(input)
    },
    async createNewCodeForDevice(input) {
      return originalPasswordlessImplementation.createNewCodeForDevice.bind(DerivedPwdless(this))(input)
    },
    async getUserByPhoneNumber(input) {
      return originalPasswordlessImplementation.getUserByPhoneNumber.bind(DerivedPwdless(this))(input)
    },
    async listCodesByDeviceId(input) {
      return originalPasswordlessImplementation.listCodesByDeviceId.bind(DerivedPwdless(this))(input)
    },
    async listCodesByEmail(input) {
      return originalPasswordlessImplementation.listCodesByEmail.bind(DerivedPwdless(this))(input)
    },
    async listCodesByPhoneNumber(input) {
      return originalPasswordlessImplementation.listCodesByPhoneNumber.bind(DerivedPwdless(this))(input)
    },
    async listCodesByPreAuthSessionId(input) {
      return originalPasswordlessImplementation.listCodesByPreAuthSessionId.bind(DerivedPwdless(this))(input)
    },
    async revokeAllCodes(input) {
      return originalPasswordlessImplementation.revokeAllCodes.bind(DerivedPwdless(this))(input)
    },
    async revokeCode(input) {
      return originalPasswordlessImplementation.revokeCode.bind(DerivedPwdless(this))(input)
    },

    async updatePasswordlessUser(this: RecipeInterface, input) {
      const user = await this.getUserById({ userId: input.userId, userContext: input.userContext })
      if (user === undefined) {
        return {
          status: 'UNKNOWN_USER_ID_ERROR',
        }
      }
      else if ('thirdParty' in user) {
        throw new Error(
          'Cannot update passwordless user info for those who signed up using third party login.',
        )
      }
      return originalPasswordlessImplementation.updateUser.bind(DerivedPwdless(this))(input)
    },

    async thirdPartySignInUp(input: {
      thirdPartyId: string
      thirdPartyUserId: string
      email: string
      userContext: any
    }): Promise<{ status: 'OK'; createdNewUser: boolean; user: User }> {
      if (originalThirdPartyImplementation === undefined)
        throw new Error('No thirdparty provider configured')

      return originalThirdPartyImplementation.signInUp.bind(DerivedTP(this))(input)
    },

    async getUserById(input: { userId: string; userContext: any }): Promise<User | undefined> {
      const user: User | undefined = await originalPasswordlessImplementation.getUserById.bind(
        DerivedPwdless(this),
      )(input)
      if (user !== undefined)
        return user

      if (originalThirdPartyImplementation === undefined)
        return undefined

      return await originalThirdPartyImplementation.getUserById.bind(DerivedTP(this))(input)
    },

    async getUsersByEmail({ email, userContext }: { email: string; userContext: any }): Promise<User[]> {
      const userFromEmailPass: User | undefined = await originalPasswordlessImplementation.getUserByEmail.bind(
        DerivedPwdless(this),
      )({ email, userContext })

      if (originalThirdPartyImplementation === undefined)
        return userFromEmailPass === undefined ? [] : [userFromEmailPass]

      const usersFromThirdParty: User[] = await originalThirdPartyImplementation.getUsersByEmail.bind(
        DerivedTP(this),
      )({ email, userContext })

      if (userFromEmailPass !== undefined)
        return [...usersFromThirdParty, userFromEmailPass]

      return usersFromThirdParty
    },

    async getUserByThirdPartyInfo(input: {
      thirdPartyId: string
      thirdPartyUserId: string
      userContext: any
    }): Promise<User | undefined> {
      if (originalThirdPartyImplementation === undefined)
        return undefined

      return originalThirdPartyImplementation.getUserByThirdPartyInfo.bind(DerivedTP(this))(input)
    },
  }
}
