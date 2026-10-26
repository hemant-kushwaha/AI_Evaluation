import { GoogleGenAI } from "@google/genai";

import { systemPrompt } from "./prompts.js";
import { tools, executeTool } from "./tools.js";
import { retrieveDocument } from "./dataset.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const model = process.env.MODEL;

export async function runSupportAgent({
  message,
  previousInteractionId = null,
}) {
  const document = retrieveDocument(message);

  const context = document
    ? `Source: ${document.id}\n${document.text}`
    : "No relevant policy document found.";

  let input = `
Relevant policy context:
${context}

User question:
${message}
`;

  let interactionId = previousInteractionId;

  const trace = {
    toolCalls: [],
    retrievedDocument: document?.id || null,
  };

  while (true) {
    const interaction = await ai.interactions.create({
      model,
      system_instruction: systemPrompt,
      input,
      previous_interaction_id: interactionId || undefined,
      tools,
    });

    interactionId = interaction.id;

    const functionResults = [];

    for (const step of interaction.steps || []) {
      if (step.type !== "function_call") continue;

      let result;

      try {
        result = await executeTool(step.name, step.arguments);
      } catch (error) {
        console.error("Tool execution error:", error);
        result = { error: error.message };
      }

      trace.toolCalls.push({
        name: step.name,
        arguments: step.arguments,
        result,
      });

      functionResults.push({
        type: "function_result",
        name: step.name,
        call_id: step.id,
        result: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result),
          },
        ],
      });
    }

    if (functionResults.length === 0) {
      return {
        answer: interaction.output_text || "",
        ...trace,
        interactionId,
      };
    }

    input = functionResults;
  }
}
