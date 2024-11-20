import {calendarServiceBaseUrl} from './constants.js';

export type AssistantEvent = {
	id: number;
	title: string;
	description: string;
	start: number;
	end: number;
};

/**
 * Adds a new event to the calendar service
 */
export async function addEvent(
	accessToken: string,
	event: Omit<AssistantEvent, 'id'>,
): Promise<AssistantEvent> {
	const resp = await fetch(`${calendarServiceBaseUrl}/event`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(event),
	});

	if (!resp.ok) {
		throw new Error(`Failed to add event: ${await resp.text()}`);
	}
	return resp.json();
}

/**
 * Updates an event in the calendar service
 */
export async function updateEvent(
	accessToken: string,
	eventId: number,
	event: Partial<Omit<AssistantEvent, 'id'>>,
): Promise<AssistantEvent> {
	const resp = await fetch(`${calendarServiceBaseUrl}/event/${eventId}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(event),
	});
	if (!resp.ok) {
		throw new Error(`Failed to update event: ${await resp.text()}`);
	}
	return resp.json();
}

/**
 * Deletes an event from the calendar service
 */
export async function deleteEvent(
	accessToken: string,
	eventId: number,
): Promise<{deleted: boolean}> {
	const resp = await fetch(`${calendarServiceBaseUrl}/event/${eventId}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	if (!resp.ok) {
		throw new Error(`Failed to delete event: ${await resp.text()}`);
	}
	return resp.json();
}

/**
 * Retrieves all events from the calendar service
 */
export async function getEvents(
	accessToken: string,
): Promise<AssistantEvent[]> {
	const resp = await fetch(`${calendarServiceBaseUrl}/event`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	if (!resp.ok) {
		throw new Error(`Failed to get events: ${await resp.text()}`);
	}
	return resp.json();
}
