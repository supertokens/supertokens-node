import { readFile } from "fs/promises";
import { authProviderBaseUrl } from "./constants.js";

export async function getAccessToken(audience: string, scope: string) {
	let clientId, clientSecret;
	try {
		const file = await readFile("../clients.json", "utf-8");
		const clients = JSON.parse(file);
		({ clientId, clientSecret } = clients.assistant);
	} catch (error) {
		throw new Error("Failed to read clients.json, please run npm start first.");
	}

	const resp = await fetch(`${authProviderBaseUrl}/auth/oauth/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
		},
		body: JSON.stringify({
			client_id: clientId,
			grant_type: "client_credentials",
			audience: audience,
			scope: scope,
		}),
	});

	if (!resp.ok) {
		throw new Error(
			`Failed to get access token: ${await resp.text()}. Please make sure that the auth-provider-service is running and that the clients.json file is correct. You can try deleting the clients.json file and re-runing npm start.`
		);
	}

	const tokens = await resp.json();
	return tokens.access_token;
}
