# SupportPilot — GenAI Evaluation Demo

A demo project exploring how to evaluate an AI customer support agent using **mocked RAG, tool calling, deterministic evaluation, and LLM-as-a-Judge**.

The goal is not just to generate AI responses, but to evaluate whether those responses are reliable and whether the agent uses tools correctly.

## Overview

The project uses Google's Gemini Interactions API to build a customer support agent that answers policy questions and retrieves order information through function calling.

It demonstrates two complementary evaluation approaches:

- **Deterministic evaluation:** Verifies tool names, arguments, and returned results against predefined expectations.
- **LLM-as-a-Judge:** Evaluates the quality of generated answers using a 1–5 rating scale.

## Architecture

```text
User Query
    |
    v
Support Agent (Gemini)
    |
    v
Mocked RAG Retrieval
    |
    v
Policy Context + User Query
    |
    v
Gemini Interactions API
    |
    +----> Function Call
    |          |
    |          v
    |      Mock Tool Execution
    |          |
    |          v
    |      Function Result
    |          |
    +<---------+
    |
    v
Final Answer
    |
    v
Evaluation Pipeline
    |
    +----> Deterministic Tool Evaluation
    |
    +----> LLM-as-a-Judge
    |
    v
Evaluation Report
```

## Mocked RAG

The project uses a small, predefined collection of policy documents instead of a production RAG pipeline.

### How retrieval works

1. Store policy documents in `dataset.js`.
2. Associate each document with relevant keywords.
3. Convert the user query to lowercase.
4. Find the first document whose keywords match the query.
5. Pass the retrieved document into the agent's context.

Example:

**Query:** `What is the refund policy?`

**Retrieved document:**

> Customers can request a refund within 7 days of delivery.

The agent uses this context to generate its answer.

**Important:** This is a simplified, mocked RAG demonstration. Retrieval uses keyword matching through JavaScript, not embeddings, semantic similarity, or a vector database. It demonstrates the retrieval-to-generation flow without implementing a full production RAG system.

## Tool Calling

The agent can call predefined mock tools to access order information.

Example tools:

- `getOrderStatus`
- `getDeliveryDate`
- `getRefundAmount`

The agent selects a tool based on the user's request. The application executes the corresponding JavaScript function and returns the result to Gemini.

Example:

**Query:** `What is the status of order ORD101?`

**Tool call:**

```json
{
  "name": "getOrderStatus",
  "arguments": {
    "orderId": "ORD101"
  }
}
```

**Mock tool result:**

```json
{
  "status": "Shipped"
}
```

The agent uses this result to generate its final answer.

These are mock order records and functions, not integrations with a real order-management system.

## Evaluation Strategy

The project separates evaluation into two independent dimensions.

### 1. Deterministic Tool Evaluation

Tool execution is evaluated using ordinary JavaScript comparisons rather than an LLM.

For each test case, the dataset defines the expected tool calls, arguments, and results.

The evaluator checks:

- Whether the expected number of tools was called.
- Whether tool names match.
- Whether arguments match the expected values.
- Whether returned results match the expected results.

Example:

| Expected                | Actual                  | Result |
| ----------------------- | ----------------------- | ------ |
| `getOrderStatus`        | `getOrderStatus`        | Pass   |
| `ORD101`                | `ORD101`                | Pass   |
| `{ status: "Shipped" }` | `{ status: "Shipped" }` | Pass   |

If any comparison fails, `toolCheck` becomes `false`.

This approach is predictable and repeatable because the expected behavior is explicitly defined in the dataset.

### 2. LLM-as-a-Judge

Deterministic checks cannot reliably assess the full meaning and quality of a natural-language answer.

For this, a separate Gemini Interactions API call acts as the evaluator.

The judge receives:

- User question
- Expected answer
- Actual generated answer
- Relevant policy context

It evaluates five criteria on a scale of 1–5.

| Criterion    | What it measures                                   |
| ------------ | -------------------------------------------------- |
| Correctness  | Is the answer factually correct?                   |
| Groundedness | Is the answer supported by the available evidence? |
| Completeness | Does it adequately answer the question?            |
| Relevance    | Does it stay focused on the request?               |
| Safety       | Does it avoid misleading or unsupported claims?    |

**Rating scale**

- **5:** Excellent
- **4:** Good, with minor omissions
- **3:** Acceptable, with noticeable omissions
- **2:** Poor, with major errors
- **1:** Very poor or seriously misleading

The overall rating is calculated as the arithmetic mean of the five criterion scores.

For example:

```text
Correctness:   5
Groundedness:  4
Completeness:  4
Relevance:     5
Safety:        5

Overall = (5 + 4 + 4 + 5 + 5) / 5
        = 4.60 / 5
```

The LLM judge provides model-based assessments, not guaranteed objective truth. Its scores can vary and should be validated against human-reviewed examples.

## Combining Both Evaluations

A test passes only when both conditions are satisfied:

```js
passed: toolCheck && evaluation.overall >= 4;
```

This prevents a good-sounding answer from passing when the expected tool behavior is incorrect.

### Example failure scenario

Suppose the user asks for the status of `ORD101`, but the test dataset incorrectly expects `getDeliveryDate`.

The agent calls `getOrderStatus`, which is correct for the question. However, the deterministic evaluator compares that call with the deliberately incorrect expectation.

Result:

```json
{
  "toolCheck": false,
  "evaluation": {
    "overall": 5
  },
  "passed": false
}
```

This is an **intentionally failing evaluator test**, not evidence that the agent made a mistake. It demonstrates that a high LLM-judge score cannot override a failed deterministic check.

## Evaluation Report

The evaluation script generates `evaluation-report.json`.

The report includes:

- Total test cases
- Successfully evaluated test cases
- Number of passed tests
- Average LLM-judge rating out of 5
- Actual and expected answers
- Deterministic tool-check results
- Recorded tool calls and results
- Individual judge scores and explanations

The average score is calculated across successfully evaluated test cases. It measures the judge's average rating, not the percentage of tests that passed.

## Project Structure

```text
supportpilot/
├── agent.js
├── tools.js
├── prompts.js
├── dataset.js
├── evaluate.js
├── server.js
├── package.json
├── .env
└── evaluation-report.json
```

| File          | Responsibility                                                |
| ------------- | ------------------------------------------------------------- |
| `agent.js`    | Runs the Gemini agent and records tool calls                  |
| `tools.js`    | Defines mock tools and their execution logic                  |
| `prompts.js`  | Contains the agent prompt and judge rubric                    |
| `dataset.js`  | Stores mock policy documents, retrieval logic, and test cases |
| `evaluate.js` | Runs deterministic checks and LLM-based evaluation            |
| `server.js`   | Exposes the agent through an Express API                      |
| `.env`        | Stores API configuration                                      |

## Getting Started

### Prerequisites

- Node.js 20+
- A Gemini API key
- A Gemini model supported by the Interactions API

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
MODEL=your_supported_interactions_api_model
PORT=3000
```

Keep your API key private and do not commit `.env` to version control.

### 3. Run the API server

```bash
npm run dev
```

### 4. Run the evaluation

```bash
npm run evaluate
```

The evaluator runs the dataset against the agent and writes the results to `evaluation-report.json`.

## Limitations

This is a demonstration project, not a production-ready evaluation platform.

- Retrieval is keyword-based and uses a small, static document collection.
- Order tools operate on mock data.
- The LLM judge can make mistakes and produce inconsistent scores.
- The current rubric and dataset cover only a small set of scenarios.
- Deterministic tool checks verify recorded calls against expected values; they do not independently validate a live external service.

## Key Takeaway

This project demonstrates why **AI response quality and tool correctness should be evaluated separately**.

Deterministic evaluation provides repeatable checks for structured behavior, while LLM-as-a-Judge helps assess qualities that are harder to capture through exact matching.

Combining the two gives a more useful view of agent reliability than either approach alone.
