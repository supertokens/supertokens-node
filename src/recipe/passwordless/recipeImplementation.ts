import { Querier } from '../../querier'
import NormalisedURLPath from '../../normalisedURLPath'
import { RecipeInterface } from './types'

export default function getRecipeInterface(querier: Querier): RecipeInterface {
  function copyAndRemoveUserContext(input: any): any {
    const result = {
      ...input,
    }
    delete result.userContext
    return result
  }

  return {
    async consumeCode(input) {
      const response = await querier.sendPostRequest(
        new NormalisedURLPath('/recipe/signinup/code/consume'),
        copyAndRemoveUserContext(input),
      )
      return response
    },
    async createCode(input) {
      const response = await querier.sendPostRequest(
        new NormalisedURLPath('/recipe/signinup/code'),
        copyAndRemoveUserContext(input),
      )
      return response
    },
    async createNewCodeForDevice(input) {
      const response = await querier.sendPostRequest(
        new NormalisedURLPath('/recipe/signinup/code'),
        copyAndRemoveUserContext(input),
      )
      return response
    },
    async getUserByEmail(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/user'),
        copyAndRemoveUserContext(input),
      )
      if (response.status === 'OK')
        return response.user

      return undefined
    },
    async getUserById(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/user'),
        copyAndRemoveUserContext(input),
      )
      if (response.status === 'OK')
        return response.user

      return undefined
    },
    async getUserByPhoneNumber(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/user'),
        copyAndRemoveUserContext(input),
      )
      if (response.status === 'OK')
        return response.user

      return undefined
    },
    async listCodesByDeviceId(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/signinup/codes'),
        copyAndRemoveUserContext(input),
      )
      return response.devices.length === 1 ? response.devices[0] : undefined
    },
    async listCodesByEmail(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/signinup/codes'),
        copyAndRemoveUserContext(input),
      )
      return response.devices
    },
    async listCodesByPhoneNumber(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/signinup/codes'),
        copyAndRemoveUserContext(input),
      )
      return response.devices
    },
    async listCodesByPreAuthSessionId(input) {
      const response = await querier.sendGetRequest(
        new NormalisedURLPath('/recipe/signinup/codes'),
        copyAndRemoveUserContext(input),
      )
      return response.devices.length === 1 ? response.devices[0] : undefined
    },
    async revokeAllCodes(input) {
      await querier.sendPostRequest(
        new NormalisedURLPath('/recipe/signinup/codes/remove'),
        copyAndRemoveUserContext(input),
      )
      return {
        status: 'OK',
      }
    },
    async revokeCode(input) {
      await querier.sendPostRequest(
        new NormalisedURLPath('/recipe/signinup/code/remove'),
        copyAndRemoveUserContext(input),
      )
      return { status: 'OK' }
    },
    async updateUser(input) {
      const response = await querier.sendPutRequest(
        new NormalisedURLPath('/recipe/user'),
        copyAndRemoveUserContext(input),
      )
      return response
    },
  }
}
