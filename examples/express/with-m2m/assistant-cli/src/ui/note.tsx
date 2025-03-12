import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { AssistantNote } from "../noteFunctions.js";
import { UncontrolledTextInput } from "ink-text-input";

type Props = {
	note: AssistantNote;
	selected: boolean;
	isEditing: boolean;
	onSave: (note: AssistantNote) => void;
	onDone: () => void;
};

export function NoteCard({ note, selected, isEditing, onSave, onDone }: Props) {
	const [selectedField, setSelectedField] = useState<keyof AssistantNote>("title");

	useInput(
		(_input, key) => {
			if (!isEditing) {
				return;
			}

			if (key.downArrow) {
				setSelectedField("description");
			}
			if (key.upArrow) {
				setSelectedField("title");
			}
			if (key.escape) {
				setSelectedField("title");
				onDone();
			}
		},
		{ isActive: isEditing }
	);

	return (
		<Box
			width={70}
			flexDirection="column"
			gap={1}
			borderStyle="round"
			borderColor={selected ? (isEditing ? "yellowBright" : "green") : "white"}>
			<Box alignItems="center">
				{isEditing && selectedField === "title" ? (
					<UncontrolledTextInput
						initialValue={note.title}
						onSubmit={(value) => onSave({ ...note, title: value })}
					/>
				) : (
					<Text bold> {note.title} </Text>
				)}
			</Box>
			<Box justifyContent="flex-start">
				{isEditing && selectedField === "description" ? (
					<UncontrolledTextInput
						initialValue={note.description}
						onSubmit={(value) => onSave({ ...note, description: value })}
					/>
				) : (
					<Text> {note.description} </Text>
				)}
			</Box>
		</Box>
	);
}
