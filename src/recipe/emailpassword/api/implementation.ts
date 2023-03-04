import { APIInterface, APIOptions, User } from '../'
import { logDebugMessage } from '../../../logger'
import Session from '../../session'
import { SessionContainerInterface } from '../../session/types'
import { GeneralErrorResponse } from '../../../types'

export default function getAPIImplementation(): APIInterface {
  return {
    async emailExistsGET({
      email,
            options,
            userContext,
    }: {
      email: string
      options: APIOptions
      userContext: any
    }): Promise<
            | {
              status: 'OK'
              exists: boolean
            }
            | GeneralErrorResponse
        > {
      const user = await options.recipeImplementation.getUserByEmail({ email, userContext })

      return {
        status: 'OK',
        exists: user !== undefined,
      }
    },
    async generatePasswordResetTokenPOST({
      formFields,
            options,
            userContext,
    }: {
      formFields: {
        id: string
        value: string
      }[]
      options: APIOptions
      userContext: any
    }): Promise<
            | {
              status: 'OK'
            }
            | GeneralErrorResponse
        > {
      const email = formFields.filter(f => f.id === 'email')[0].value

      const user = await options.recipeImplementation.getUserByEmail({ email, userContext })
      if (user === undefined) {
        return {
          status: 'OK',
        }
      }

      const response = await options.recipeImplementation.createResetPasswordToken({
        userId: user.id,
        userContext,
      })
      if (response.status === 'UNKNOWN_USER_ID_ERROR') {
        logDebugMessage(`Password reset email not sent, unknown user id: ${user.id}`)
        return {
          status: 'OK',
        }
      }

      const passwordResetLink
                = `${options.appInfo.websiteDomain.getAsStringDangerous()
                + options.appInfo.websiteBasePath.getAsStringDangerous()
                 }/reset-password?token=${
                 response.token
                 }&rid=${
                 options.recipeId}`

      logDebugMessage(`Sending password reset email to ${email}`)
      await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
        type: 'PASSWORD_RESET',
        user,
        passwordResetLink,
        userContext,
      })

      return {
        status: 'OK',
      }
    },
    async passwordResetPOST({
      formFields,
            token,
            options,
            userContext,
    }: {
      formFields: {
        id: string
        value: string
      }[]
      token: string
      options: APIOptions
      userContext: any
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
            | GeneralErrorResponse
        > {
      const newPassword = formFields.filter(f => f.id === 'password')[0].value

      const response = await options.recipeImplementation.resetPasswordUsingToken({
        token,
        newPassword,
        userContext,
      })

      return response
    },
    async signInPOST({
      formFields,
            options,
            userContext,
    }: {
      formFields: {
        id: string
        value: string
      }[]
      options: APIOptions
      userContext: any
    }): Promise<
            | {
              status: 'OK'
              session: SessionContainerInterface
              user: User
            }
            | {
              status: 'WRONG_CREDENTIALS_ERROR'
            }
            | GeneralErrorResponse
        > {
      const email = formFields.filter(f => f.id === 'email')[0].value
      const password = formFields.filter(f => f.id === 'password')[0].value

      const response = await options.recipeImplementation.signIn({ email, password, userContext })
      if (response.status === 'WRONG_CREDENTIALS_ERROR')
        return response

      const user = response.user

      const session = await Session.createNewSession(options.req, options.res, user.id, {}, {}, userContext)
      return {
        status: 'OK',
        session,
        user,
      }
    },
    async signUpPOST({
      formFields,
            options,
            userContext,
    }: {
      formFields: {
        id: string
        value: string
      }[]
      options: APIOptions
      userContext: any
    }): Promise<
            | {
              status: 'OK'
              session: SessionContainerInterface
              user: User
            }
            | {
              status: 'EMAIL_ALREADY_EXISTS_ERROR'
            }
            | GeneralErrorResponse
        > {
      const email = formFields.filter(f => f.id === 'email')[0].value
      const password = formFields.filter(f => f.id === 'password')[0].value

      const response = await options.recipeImplementation.signUp({ email, password, userContext })
      if (response.status === 'EMAIL_ALREADY_EXISTS_ERROR')
        return response

      const user = response.user

      const session = await Session.createNewSession(options.req, options.res, user.id, {}, {}, userContext)
      return {
        status: 'OK',
        session,
        user,
      }
    },
  }
}
