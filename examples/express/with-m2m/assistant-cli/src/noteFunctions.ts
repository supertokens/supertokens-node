import {noteServiceBaseUrl} from './constants.js';

export type AssistantNote = {
	id: number;
	title: string;
	description: string;
};

/**
 * Adds a new note to the note service
 */
export async function addNote(
	accessToken: string,
	note: Omit<AssistantNote, 'id'>,
): Promise<AssistantNote> {
	const resp = await fetch(`${noteServiceBaseUrl}/note`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
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
 */
export async function deleteNote(
	accessToken: string,
	noteId: number,
): Promise<{deleted: boolean}> {
	const resp = await fetch(`${noteServiceBaseUrl}/note/${noteId}`, {
		method: 'DELETE',
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
 */
export async function getNotes(accessToken: string): Promise<AssistantNote[]> {
	const resp = await fetch(`${noteServiceBaseUrl}/note`, {
		method: 'GET',
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
 */
export async function updateNote(
	accessToken: string,
	noteId: number,
	note: Partial<Omit<AssistantNote, 'id'>>,
): Promise<AssistantNote> {
	const resp = await fetch(`${noteServiceBaseUrl}/note/${noteId}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(note),
	});
	if (!resp.ok) {
		throw new Error(`Failed to update note: ${await resp.text()}`);
	}
	return resp.json();
}
