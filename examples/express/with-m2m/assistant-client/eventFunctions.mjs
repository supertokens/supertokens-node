import { calendarServiceBaseUrl } from "./constants.mjs";

/**
 * @typedef {Object} AssistantEvent
 * @property {number} id - The unique identifier for the event
 * @property {string} title - The title of the event
 * @property {string} description - The description of the event
 * @property {number} start - The start timestamp of the event
 * @property {number} end - The end timestamp of the event
 */
/**
 * Adds a new event to the calendar service
 * @param {string} accessToken - The access token for authorization
 * @param {Omit<AssistantEvent, "id">} event - The event details to add
 * @returns {Promise<AssistantEvent>} The created event
 * @throws {Error} If the request fails
 */

export async function addEvent(accessToken, event) {
    const resp = await fetch(`${calendarServiceBaseUrl}/event`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
    });

    if (!resp.ok) {
        throw new Error(`Failed to add event: ${await resp.text()}`);
    }
    return resp.json();
}
/**
 * Deletes an event from the calendar service
 * @param {string} accessToken - The access token for authorization
 * @param {number} eventId - The ID of the event to delete
 * @returns {Promise<{ deleted: boolean }>} Returns true if the event was deleted successfully, false if the event was already deleted/not found
 * @throws {Error} If the request fails
 */

export async function deleteEvent(accessToken, eventId) {
    const resp = await fetch(`${calendarServiceBaseUrl}/event/${eventId}`, {
        method: "DELETE",
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
 * @param {string} accessToken - The access token for authorization
 * @returns {Promise<AssistantEvent[]>} The list of events
 * @throws {Error} If the request fails
 */

export async function getEvents(accessToken) {
    const resp = await fetch(`${calendarServiceBaseUrl}/event`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to get events: ${await resp.text()}`);
    }
    return resp.json();
}
