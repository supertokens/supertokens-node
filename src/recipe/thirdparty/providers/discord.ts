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
import axios from 'axios'
import { TypeProvider, TypeProviderGetResponse } from '../types'

interface TypeThirdPartyProviderDiscordConfig {
  clientId: string
  clientSecret: string
  scope?: string[]
  authorisationRedirect?: {
    params?: { [key: string]: string | ((request: any) => string) }
  }
  isDefault?: boolean
}

export default function Discord(config: TypeThirdPartyProviderDiscordConfig): TypeProvider {
  const id = 'discord'

  function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
    const accessTokenAPIURL = 'https://discord.com/api/oauth2/token'
    const accessTokenAPIParams: { [key: string]: string } = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
    }
    if (authCodeFromRequest !== undefined)
      accessTokenAPIParams.code = authCodeFromRequest

    if (redirectURI !== undefined)
      accessTokenAPIParams.redirect_uri = redirectURI

    const authorisationRedirectURL = 'https://discord.com/api/oauth2/authorize'
    let scopes = ['email', 'identify']
    if (config.scope !== undefined) {
      scopes = config.scope
      scopes = Array.from(new Set(scopes))
    }
    const additionalParams
            = (config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined)
              ? {}
              : config.authorisationRedirect.params
    const authorizationRedirectParams: { [key: string]: string } = {
      scope: scopes.join(' '),
      client_id: config.clientId,
      response_type: 'code',
      ...additionalParams,
    }

    async function getProfileInfo(accessTokenAPIResponse: {
      access_token: string
      expires_in: number
      token_type: string
    }) {
      const accessToken = accessTokenAPIResponse.access_token
      const authHeader = `Bearer ${accessToken}`
      const response = await axios({
        method: 'get',
        url: 'https://discord.com/api/users/@me',
        headers: {
          Authorization: authHeader,
        },
      })
      const userInfo = response.data
      return {
        id: userInfo.id,
        email:
                    userInfo.email === undefined
                      ? undefined
                      : {
                          id: userInfo.email,
                          isVerified: userInfo.verified,
                        },
      }
    }
    return {
      accessTokenAPI: {
        url: accessTokenAPIURL,
        params: accessTokenAPIParams,
      },
      authorisationRedirect: {
        url: authorisationRedirectURL,
        params: authorizationRedirectParams,
      },
      getProfileInfo,
      getClientId: () => {
        return config.clientId
      },
    }
  }

  return {
    id,
    get,
    isDefault: config.isDefault,
  }
}
