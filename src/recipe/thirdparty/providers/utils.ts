import { VerifyOptions, verify } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

export async function verifyIdTokenFromJWKSEndpoint(
  idToken: string,
  jwksUri: string,
  otherOptions: VerifyOptions,
): Promise<any> {
  const client = jwksClient({
    jwksUri,
  })
  function getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (_, key: any) => {
      const signingKey = key.publicKey || key.rsaPublicKey
      callback(null, signingKey)
    })
  }

  const payload: any = await new Promise((resolve, reject) => {
    verify(idToken, getKey, otherOptions, (err, decoded) => {
      if (err)
        reject(err)
      else
        resolve(decoded)
    })
  })

  return payload
}
