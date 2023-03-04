/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import STError from './error'
import { ParsedJWTInfo, verifyJWT } from './jwt'

export async function getInfoFromAccessToken(
  jwtInfo: ParsedJWTInfo,
  jwtSigningPublicKey: string,
  doAntiCsrfCheck: boolean,
): Promise<{
  sessionHandle: string
  userId: string
  refreshTokenHash1: string
  parentRefreshTokenHash1: string | undefined
  userData: any
  antiCsrfToken: string | undefined
  expiryTime: number
  timeCreated: number
}> {
  try {
    verifyJWT(jwtInfo, jwtSigningPublicKey)
    const payload = jwtInfo.payload

    // This should be called before this function, but the check is very quick, so we can also do them here
    validateAccessTokenStructure(payload)

    // We can mark these as defined (the ! after the calls), since validateAccessTokenPayload checks this
    const sessionHandle = sanitizeStringInput(payload.sessionHandle)!
    const userId = sanitizeStringInput(payload.userId)!
    const refreshTokenHash1 = sanitizeStringInput(payload.refreshTokenHash1)!
    const parentRefreshTokenHash1 = sanitizeStringInput(payload.parentRefreshTokenHash1)
    const userData = payload.userData
    const antiCsrfToken = sanitizeStringInput(payload.antiCsrfToken)
    const expiryTime = sanitizeNumberInput(payload.expiryTime)!
    const timeCreated = sanitizeNumberInput(payload.timeCreated)!

    if (antiCsrfToken === undefined && doAntiCsrfCheck)
      throw new Error('Access token does not contain the anti-csrf token.')

    if (expiryTime < Date.now())
      throw new Error('Access token expired')

    return {
      sessionHandle,
      userId,
      refreshTokenHash1,
      parentRefreshTokenHash1,
      userData,
      antiCsrfToken,
      expiryTime,
      timeCreated,
    }
  }
  catch (err) {
    throw new STError({
      message: 'Failed to verify access token',
      type: STError.TRY_REFRESH_TOKEN,
    })
  }
}

export function validateAccessTokenStructure(payload: any) {
  if (
    typeof payload.sessionHandle !== 'string'
        || typeof payload.userId !== 'string'
        || typeof payload.refreshTokenHash1 !== 'string'
        || payload.userData === undefined
        || typeof payload.expiryTime !== 'number'
        || typeof payload.timeCreated !== 'number'
  ) {
    // it would come here if we change the structure of the JWT.
    throw new Error('Access token does not contain all the information. Maybe the structure has changed?')
  }
}

function sanitizeStringInput(field: any): string | undefined {
  if (field === '')
    return ''

  if (typeof field !== 'string')
    return undefined

  try {
    const result = field.trim()
    return result
  }
  catch (err) {}
  return undefined
}

export function sanitizeNumberInput(field: any): number | undefined {
  if (typeof field === 'number')
    return field

  return undefined
}
