import { Querier } from '../../querier'
import NormalisedURLPath from '../../normalisedURLPath'
import { RecipeInterface, User } from './'

export default function getRecipeInterface(querier: Querier): RecipeInterface {
  return {
    async createEmailVerificationToken({
      userId,
            email,
    }: {
      userId: string
      email: string
    }): Promise<
            | {
              status: 'OK'
              token: string
            }
            | { status: 'EMAIL_ALREADY_VERIFIED_ERROR' }
        > {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/user/email/verify/token'), {
        userId,
        email,
      })
      if (response.status === 'OK') {
        return {
          status: 'OK',
          token: response.token,
        }
      }
      else {
        return {
          status: 'EMAIL_ALREADY_VERIFIED_ERROR',
        }
      }
    },

    async verifyEmailUsingToken({
      token,
    }: {
      token: string
    }): Promise<{ status: 'OK'; user: User } | { status: 'EMAIL_VERIFICATION_INVALID_TOKEN_ERROR' }> {
      const response = await querier.sendPostRequest(new NormalisedURLPath('/recipe/user/email/verify'), {
        method: 'token',
        token,
      })
      if (response.status === 'OK') {
        return {
          status: 'OK',
          user: {
            id: response.userId,
            email: response.email,
          },
        }
      }
      else {
        return {
          status: 'EMAIL_VERIFICATION_INVALID_TOKEN_ERROR',
        }
      }
    },

    async isEmailVerified({ userId, email }: { userId: string; email: string }): Promise<boolean> {
      const response = await querier.sendGetRequest(new NormalisedURLPath('/recipe/user/email/verify'), {
        userId,
        email,
      })
      return response.isVerified
    },

    async revokeEmailVerificationTokens(input: {
      userId: string
      email: string
    }): Promise<{ status: 'OK' }> {
      await querier.sendPostRequest(new NormalisedURLPath('/recipe/user/email/verify/token/remove'), {
        userId: input.userId,
        email: input.email,
      })
      return { status: 'OK' }
    },

    async unverifyEmail(input: { userId: string; email: string }): Promise<{ status: 'OK' }> {
      await querier.sendPostRequest(new NormalisedURLPath('/recipe/user/email/verify/remove'), {
        userId: input.userId,
        email: input.email,
      })
      return { status: 'OK' }
    },
  }
}
