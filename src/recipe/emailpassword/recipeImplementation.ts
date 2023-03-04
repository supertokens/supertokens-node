import { Querier } from '../../querier'
import NormalisedURLPath from '../../normalisedURLPath'
import { RecipeInterface, User } from './types'

export default function getRecipeInterface(querier: Querier): RecipeInterface {
  return {
    async signUp({
      email,
            password,
    }: {
      email: string
      password: string
    }): Promise<{ status: 'OK'; user: User } | { status: 'EMAIL_ALREADY_EXISTS_ERROR' }> {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/signup'), {
        email,
        password,
      })
      if (response.status === 'OK') {
        return response
      }
      else {
        return {
          status: 'EMAIL_ALREADY_EXISTS_ERROR',
        }
      }
    },

    async signIn({
      email,
            password,
    }: {
      email: string
      password: string
    }): Promise<{ status: 'OK'; user: User } | { status: 'WRONG_CREDENTIALS_ERROR' }> {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/signin'), {
        email,
        password,
      })
      if (response.status === 'OK') {
        return response
      }
      else {
        return {
          status: 'WRONG_CREDENTIALS_ERROR',
        }
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

    async getUserByEmail({ email }: { email: string }): Promise<User | undefined> {
      const response = await querier.sendGetRequest(new NormalisedURLPath('/recipe/user'), {
        email,
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

    async createResetPasswordToken({
      userId,
    }: {
      userId: string
    }): Promise<{ status: 'OK'; token: string } | { status: 'UNKNOWN_USER_ID_ERROR' }> {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/user/password/reset/token'), {
        userId,
      })
      if (response.status === 'OK') {
        return {
          status: 'OK',
          token: response.token,
        }
      }
      else {
        return {
          status: 'UNKNOWN_USER_ID_ERROR',
        }
      }
    },

    async resetPasswordUsingToken({
      token,
            newPassword,
    }: {
      token: string
      newPassword: string
    }): Promise<
            | {
              status: 'OK'
              /**
                   * The id of the user whose password was reset.
                   * Defined for Core versions 3.9 or later
                   */
              userId?: string
            }
            | { status: 'RESET_PASSWORD_INVALID_TOKEN_ERROR' }
        > {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/user/password/reset'), {
        method: 'token',
        token,
        newPassword,
      })
      return response
    },

    async updateEmailOrPassword(input: {
      userId: string
      email?: string
      password?: string
    }): Promise<{ status: 'OK' | 'UNKNOWN_USER_ID_ERROR' | 'EMAIL_ALREADY_EXISTS_ERROR' }> {
      const response = await querier.sendPutRequest(new NormalisedURLPath('/recipe/user'), {
        userId: input.userId,
        email: input.email,
        password: input.password,
      })
      if (response.status === 'OK') {
        return {
          status: 'OK',
        }
      }
      else if (response.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
        return {
          status: 'EMAIL_ALREADY_EXISTS_ERROR',
        }
      }
      else {
        return {
          status: 'UNKNOWN_USER_ID_ERROR',
        }
      }
    },
  }
}
