import { RecipeInterface } from '../../passwordless/types'
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from '../types'

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
  return {
    async consumeCode(input) {
      return await recipeInterface.consumeCode(input)
    },
    async createCode(input) {
      return await recipeInterface.createCode(input)
    },
    async createNewCodeForDevice(input) {
      return await recipeInterface.createNewCodeForDevice(input)
    },
    async getUserByEmail(input) {
      const users = await recipeInterface.getUsersByEmail(input)
      for (let i = 0; i < users.length; i++) {
        const u = users[i]
        if (!('thirdParty' in u))
          return u
      }
      return undefined
    },
    async getUserById(input) {
      const user = await recipeInterface.getUserById(input)
      if (user !== undefined && 'thirdParty' in user) {
        // this is a thirdparty user.
        return undefined
      }
      return user
    },
    async getUserByPhoneNumber(input) {
      const user = await recipeInterface.getUserByPhoneNumber(input)
      if (user !== undefined && 'thirdParty' in user) {
        // this is a thirdparty user.
        return undefined
      }
      return user
    },
    async listCodesByDeviceId(input) {
      return await recipeInterface.listCodesByDeviceId(input)
    },
    async listCodesByEmail(input) {
      return await recipeInterface.listCodesByEmail(input)
    },
    async listCodesByPhoneNumber(input) {
      return await recipeInterface.listCodesByPhoneNumber(input)
    },
    async listCodesByPreAuthSessionId(input) {
      return await recipeInterface.listCodesByPreAuthSessionId(input)
    },
    async revokeAllCodes(input) {
      return await recipeInterface.revokeAllCodes(input)
    },
    async revokeCode(input) {
      return await recipeInterface.revokeCode(input)
    },
    async updateUser(input) {
      return await recipeInterface.updatePasswordlessUser(input)
    },
  }
}
