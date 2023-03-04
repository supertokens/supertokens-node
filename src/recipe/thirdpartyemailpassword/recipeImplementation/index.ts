import { RecipeInterface, User } from '../types'
import EmailPasswordImplemenation from '../../emailpassword/recipeImplementation'

import ThirdPartyImplemenation from '../../thirdparty/recipeImplementation'
import { RecipeInterface as ThirdPartyRecipeInterface } from '../../thirdparty'
import { Querier } from '../../../querier'
import DerivedEP from './emailPasswordRecipeImplementation'
import DerivedTP from './thirdPartyRecipeImplementation'

export default function getRecipeInterface(
  emailPasswordQuerier: Querier,
  thirdPartyQuerier?: Querier,
): RecipeInterface {
  const originalEmailPasswordImplementation = EmailPasswordImplemenation(emailPasswordQuerier)
  let originalThirdPartyImplementation: undefined | ThirdPartyRecipeInterface
  if (thirdPartyQuerier !== undefined)
    originalThirdPartyImplementation = ThirdPartyImplemenation(thirdPartyQuerier)

  return {
    async emailPasswordSignUp(input: {
      email: string
      password: string
      userContext: any
    }): Promise<{ status: 'OK'; user: User } | { status: 'EMAIL_ALREADY_EXISTS_ERROR' }> {
      return await originalEmailPasswordImplementation.signUp.bind(DerivedEP(this))(input)
    },

    async emailPasswordSignIn(input: {
      email: string
      password: string
      userContext: any
    }): Promise<{ status: 'OK'; user: User } | { status: 'WRONG_CREDENTIALS_ERROR' }> {
      return originalEmailPasswordImplementation.signIn.bind(DerivedEP(this))(input)
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
      const user: User | undefined = await originalEmailPasswordImplementation.getUserById.bind(DerivedEP(this))(
        input,
      )
      if (user !== undefined)
        return user

      if (originalThirdPartyImplementation === undefined)
        return undefined

      return await originalThirdPartyImplementation.getUserById.bind(DerivedTP(this))(input)
    },

    async getUsersByEmail({ email, userContext }: { email: string; userContext: any }): Promise<User[]> {
      const userFromEmailPass: User | undefined = await originalEmailPasswordImplementation.getUserByEmail.bind(
        DerivedEP(this),
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

    async createResetPasswordToken(input: {
      userId: string
      userContext: any
    }): Promise<{ status: 'OK'; token: string } | { status: 'UNKNOWN_USER_ID_ERROR' }> {
      return originalEmailPasswordImplementation.createResetPasswordToken.bind(DerivedEP(this))(input)
    },

    async resetPasswordUsingToken(input: { token: string; newPassword: string; userContext: any }) {
      return originalEmailPasswordImplementation.resetPasswordUsingToken.bind(DerivedEP(this))(input)
    },

    async updateEmailOrPassword(
      this: RecipeInterface,
      input: {
        userId: string
        email?: string
        password?: string
        userContext: any
      },
    ): Promise<{ status: 'OK' | 'UNKNOWN_USER_ID_ERROR' | 'EMAIL_ALREADY_EXISTS_ERROR' }> {
      const user = await this.getUserById({ userId: input.userId, userContext: input.userContext })
      if (user === undefined) {
        return {
          status: 'UNKNOWN_USER_ID_ERROR',
        }
      }
      else if (user.thirdParty !== undefined) {
        throw new Error('Cannot update email or password of a user who signed up using third party login.')
      }
      return originalEmailPasswordImplementation.updateEmailOrPassword.bind(DerivedEP(this))(input)
    },
  }
}
