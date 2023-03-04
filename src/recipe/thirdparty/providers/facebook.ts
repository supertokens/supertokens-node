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

interface TypeThirdPartyProviderFacebookConfig {
  clientId: string
  clientSecret: string
  scope?: string[]
  isDefault?: boolean
}

export default function Facebook(config: TypeThirdPartyProviderFacebookConfig): TypeProvider {
  const id = 'facebook'

  function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
    const accessTokenAPIURL = 'https://graph.facebook.com/v9.0/oauth/access_token'
    const accessTokenAPIParams: { [key: string]: string } = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }
    if (authCodeFromRequest !== undefined)
      accessTokenAPIParams.code = authCodeFromRequest

    if (redirectURI !== undefined)
      accessTokenAPIParams.redirect_uri = redirectURI

    const authorisationRedirectURL = 'https://www.facebook.com/v9.0/dialog/oauth'
    let scopes = ['email']
    if (config.scope !== undefined) {
      scopes = config.scope
      scopes = Array.from(new Set(scopes))
    }
    const authorizationRedirectParams: { [key: string]: string } = {
      scope: scopes.join(' '),
      response_type: 'code',
      client_id: config.clientId,
    }

    async function getProfileInfo(accessTokenAPIResponse: {
      access_token: string
      expires_in: number
      token_type: string
    }) {
      const accessToken = accessTokenAPIResponse.access_token
      const response = await axios({
        method: 'get',
        url: 'https://graph.facebook.com/me',
        params: {
          access_token: accessToken,
          fields: 'id,email',
          format: 'json',
        },
      })
      const userInfo = response.data
      const id = userInfo.id
      const email = userInfo.email
      if (email === undefined || email === null) {
        return {
          id,
        }
      }
      return {
        id,
        email: {
          id: email,
          isVerified: true,
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
