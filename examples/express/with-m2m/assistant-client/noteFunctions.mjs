import { noteServiceBaseUrl } from "./constants.mjs";

/**
 * @typedef {Object} AssistantNote
 * @property {number} id - The unique identifier for the note
 * @property {string} title - The title of the note
 * @property {string} description - The description of the note
 */
/**
 * Adds a new note to the note service
 * @param {string} accessToken - The access token for authorization
 * @param {Omit<AssistantNote, "id">} note - The note details to add
 * @returns {Promise<AssistantNote>} The created note
 * @throws {Error} If the request fails
 */

export async function addNote(accessToken, note) {
    const resp = await fetch(`${noteServiceBaseUrl}/note`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(note),
    });
    if (!resp.ok) {
        throw new Error(`Failed to add note: ${await resp.text()}`);
    }
    return resp.json();
}
/**
 * Deletes a note from the note service
 * @param {string} accessToken - The access token for authorization
 * @param {number} noteId - The ID of the note to delete
 * @returns {Promise<{ deleted: boolean }>} Returns true if the note was deleted successfully, false if the note was already deleted/not found
 * @throws {Error} If the request fails
 */

export async function deleteNote(accessToken, noteId) {
    const resp = await fetch(`${noteServiceBaseUrl}/note/${noteId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to delete note: ${await resp.text()}`);
    }
    return resp.json();
}
/**
 * Retrieves all notes from the note service
 * @param {string} accessToken - The access token for authorization
 * @returns {Promise<AssistantNote[]>} The list of notes
 * @throws {Error} If the request fails
 */

export async function getNotes(accessToken) {
    const resp = await fetch(`${noteServiceBaseUrl}/note`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!resp.ok) {
        throw new Error(`Failed to get notes: ${await resp.text()}`);
    }
    return resp.json();
}
/**
 * Updates a note in the note service
 * @param {string} accessToken - The access token for authorization
 * @param {number} noteId - The ID of the note to update
 * @param {Partial<Omit<AssistantNote, "id">>} note - The note data to update
 * @returns {Promise<AssistantNote>} The updated note
 * @throws {Error} If the request fails
 */

export async function updateNote(accessToken, noteId, note) {
    const resp = await fetch(`${noteServiceBaseUrl}/note/${noteId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(note),
    });
    if (!resp.ok) {
        throw new Error(`Failed to update note: ${await resp.text()}`);
    }
    return resp.json();
}
