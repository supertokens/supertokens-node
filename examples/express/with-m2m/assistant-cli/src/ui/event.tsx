import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { AssistantEvent } from "../eventFunctions.js";
import { UncontrolledTextInput } from "ink-text-input";

type Props = {
	event: AssistantEvent;
	selected: boolean;
	isEditing: boolean;
	onSave: (event: AssistantEvent) => void;
	onDone: () => void;
};

export function EventCard({ event, selected, isEditing, onSave, onDone }: Props) {
	const [selectedField, setSelectedField] = useState<keyof AssistantEvent>("title");

	useInput(
		(_input, key) => {
			if (!isEditing) {
				return;
			}

			if (key.downArrow) {
				switch (selectedField) {
					case "title":
						setSelectedField("start");
						break;
					case "start":
						setSelectedField("end");
						break;
					case "end":
						setSelectedField("description");
						break;
					case "description":
						setSelectedField("title");
						break;
					default:
						setSelectedField("title");
				}
			}
			if (key.upArrow) {
				switch (selectedField) {
					case "description":
						setSelectedField("end");
						break;
					case "end":
						setSelectedField("start");
						break;
					case "start":
						setSelectedField("title");
						break;
					case "title":
						setSelectedField("title");
						break;
					default:
						setSelectedField("title");
				}
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
				{isEditing && (selectedField === "title" || selectedField === undefined) ? (
					<UncontrolledTextInput
						initialValue={event.title}
						onSubmit={(value) => onSave({ ...event, title: value })}
					/>
				) : (
					<Text bold> {event.title} </Text>
				)}
			</Box>
			<Box>
				{isEditing && selectedField === "start" ? (
					<UncontrolledTextInput
						initialValue={new Date(event.start).toLocaleString()}
						onSubmit={(value) => onSave({ ...event, start: Date.parse(value) })}
					/>
				) : (
					<Text bold> {new Date(event.start).toLocaleString()} </Text>
				)}
				<Text> - </Text>
				{isEditing && selectedField === "end" ? (
					<UncontrolledTextInput
						initialValue={new Date(event.end).toLocaleString()}
						onSubmit={(value) => {
							if (Number.isNaN(Date.parse(value))) {
								return onSave({ ...event, end: Date.parse(value) });
							}
						}}
					/>
				) : (
					<Text bold> {new Date(event.end).toLocaleString()} </Text>
				)}
			</Box>
			<Box justifyContent="flex-start">
				{isEditing && selectedField === "description" ? (
					<UncontrolledTextInput
						initialValue={event.description}
						onSubmit={(value) => onSave({ ...event, description: value })}
					/>
				) : (
					<Text> {event.description} </Text>
				)}
			</Box>
		</Box>
	);
}
