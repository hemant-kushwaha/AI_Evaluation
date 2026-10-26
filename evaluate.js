import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { GoogleGenAI } from "@google/genai";

import { runSupportAgent } from "./agent.js";
import { evaluationDataset, retrieveDocument } from "./dataset.js";
import { judgeRubric } from "./prompts.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const model = process.env.MODEL;

// Deterministic evaluation: compare expected and actual tool calls.
function checkTools(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }

  return expected.every((expectedCall, index) => {
    const actualCall = actual[index];

    return (
      actualCall.name === expectedCall.name &&
      isDeepStrictEqual(actualCall.arguments, expectedCall.arguments) &&
      isDeepStrictEqual(actualCall.result, expectedCall.expectedResult)
    );
  });
}

// LLM evaluation: judge the final answer from 1 to 5.
async function judgeResponse({ question, expected, actual, context }) {
  const interaction = await ai.interactions.create({
    model,
    system_instruction: judgeRubric,
    input: `
Evaluate this customer support response.

User question:
${question}

Expected answer:
${expected}

Reference context:
${context || "No relevant policy document found."}

Actual answer:
${actual}

Return only the requested JSON.
`,
  });

  const output = interaction.output_text || "";

  const cleanedOutput = output
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const evaluation = JSON.parse(cleanedOutput);

  const criteria = [
    "correctness",
    "groundedness",
    "completeness",
    "relevance",
    "safety",
  ];

  for (const key of criteria) {
    if (
      !Number.isInteger(evaluation[key]) ||
      evaluation[key] < 1 ||
      evaluation[key] > 5
    ) {
      throw new Error(`Invalid judge score: ${key}`);
    }
  }

  evaluation.overall = Number(
    (
      criteria.reduce((sum, key) => sum + evaluation[key], 0) / criteria.length
    ).toFixed(2),
  );

  return evaluation;
}

const results = [];

for (const testCase of evaluationDataset) {
  console.log(`Evaluating ${testCase.id}...`);

  try {
    const agentResult = await runSupportAgent({
      message: testCase.input,
    });

    // 1. Deterministic tool evaluation.
    const toolCheck = checkTools(
      agentResult.toolCalls,
      testCase.expectedToolCalls,
    );

    // 2. Prepare reference context for the judge.
    const document = retrieveDocument(testCase.input);

    const context = document
      ? `Policy document (${document.id}):\n${document.text}`
      : "No relevant policy document found.";

    // 3. LLM judge evaluation.
    const evaluation = await judgeResponse({
      question: testCase.input,
      expected: testCase.expected,
      actual: agentResult.answer,
      context,
    });

    results.push({
      id: testCase.id,
      input: testCase.input,
      expected: testCase.expected,
      actual: agentResult.answer,
      toolCheck,
      toolCalls: agentResult.toolCalls,
      evaluation,
      passed: toolCheck && evaluation.overall >= 4,
    });
  } catch (error) {
    console.error(`${testCase.id} failed:`, error.message);

    results.push({
      id: testCase.id,
      input: testCase.input,
      passed: false,
      error: error.message,
    });
  }
}

// Calculate report statistics.
const successfulResults = results.filter((result) => result.evaluation);

const report = {
  totalTests: results.length,
  evaluatedTests: successfulResults.length,
  passed: results.filter((result) => result.passed).length,

  averageScore:
    successfulResults.length === 0
      ? 0
      : Number(
          (
            successfulResults.reduce(
              (sum, result) => sum + result.evaluation.overall,
              0,
            ) / successfulResults.length
          ).toFixed(2),
        ),

  results,
};

await writeFile("evaluation-report.json", JSON.stringify(report, null, 2));

console.log("\nEvaluation complete.");
console.log(`Total tests: ${report.totalTests}`);
console.log(`LLM evaluated: ${report.evaluatedTests}`);
console.log(`Passed: ${report.passed}/${report.totalTests}`);
console.log(`Average rating: ${report.averageScore}/5`);
console.log("Report saved to evaluation-report.json");
