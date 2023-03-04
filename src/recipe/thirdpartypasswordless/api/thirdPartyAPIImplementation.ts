import { APIInterface } from '../../thirdparty'
import { APIInterface as ThirdPartyPasswordlessAPIInterface } from '../types'

export default function getIterfaceImpl(apiImplmentation: ThirdPartyPasswordlessAPIInterface): APIInterface {
  const signInUpPOSTFromThirdPartyPasswordless = apiImplmentation.thirdPartySignInUpPOST?.bind(apiImplmentation)
  return {
    authorisationUrlGET: apiImplmentation.authorisationUrlGET?.bind(apiImplmentation),
    appleRedirectHandlerPOST: apiImplmentation.appleRedirectHandlerPOST?.bind(apiImplmentation),
    signInUpPOST:
            signInUpPOSTFromThirdPartyPasswordless === undefined
              ? undefined
              : async function (input) {
                const result = await signInUpPOSTFromThirdPartyPasswordless(input)
                if (result.status === 'OK') {
                  if (!('thirdParty' in result.user))
                    throw new Error('Should never come here')

                  return {
                    ...result,
                    user: {
                      ...result.user,
                      thirdParty: {
                        ...result.user.thirdParty,
                      },
                    },
                  }
                }
                return result
              },
  }
}
