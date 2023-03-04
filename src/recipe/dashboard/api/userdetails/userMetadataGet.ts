import { APIFunction, APIInterface, APIOptions } from '../../types'
import STError from '../../../../error'
import UserMetaDataRecipe from '../../../usermetadata/recipe'
import UserMetaData from '../../../usermetadata'

type Response =
    | {
      status: 'FEATURE_NOT_ENABLED_ERROR'
    }
    | {
      status: 'OK'
      data: any
    }

export const userMetaDataGet: APIFunction = async (_: APIInterface, options: APIOptions): Promise<Response> => {
  const userId = options.req.getKeyValueFromQuery('userId')

  if (userId === undefined) {
    throw new STError({
      message: 'Missing required parameter \'userId\'',
      type: STError.BAD_INPUT_ERROR,
    })
  }

  try {
    UserMetaDataRecipe.getInstanceOrThrowError()
  }
  catch (e) {
    return {
      status: 'FEATURE_NOT_ENABLED_ERROR',
    }
  }

  const metaDataResponse = UserMetaData.getUserMetadata(userId)
  return {
    status: 'OK',
    data: (await metaDataResponse).metadata,
  }
}
