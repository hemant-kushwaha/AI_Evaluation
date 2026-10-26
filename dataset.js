export const documents = [
  {
    id: "POL001",
    text: "Customers can request a refund within 7 days of delivery.",
    keywords: ["refund", "return", "money"],
  },
  {
    id: "POL002",
    text: "Standard delivery usually takes 3 to 5 business days.",
    keywords: ["delivery", "shipping", "arrival"],
  },
  {
    id: "POL003",
    text: "Customers can track orders using their order ID.",
    keywords: ["track", "tracking", "order status"],
  },
];

export function retrieveDocument(message) {
  const query = message.toLowerCase();

  return (
    documents.find((document) =>
      document.keywords.some((keyword) => query.includes(keyword)),
    ) || null
  );
}

export const evaluationDataset = [
  {
    id: "TC001",
    input: "What is the refund policy?",
    expected: "Customers can request a refund within 7 days of delivery.",
    expectedToolCalls: [],
  },
  {
    id: "TC002",
    input: "How long does standard delivery take?",
    expected: "Standard delivery usually takes 3 to 5 business days.",
    expectedToolCalls: [],
  },
  {
    id: "TC003",
    input: "What is the status of order ORD101?",
    expected: "The order has been shipped.",
    expectedToolCalls: [
      {
        name: "getOrderStatus",
        arguments: { orderId: "ORD101" },
        expectedResult: { status: "Shipped" },
      },
    ],
  },
  {
    id: "TC004",
    input: "What is the status of order ORD101?",
    expected: "The order has been shipped.",

    // Intentionally incorrect expectation for testing.
    expectedToolCalls: [
      {
        name: "getDeliveryDate",
        arguments: { orderId: "ORD101" },
        expectedResult: { deliveryDate: "2026-10-28" },
      },
    ],
  },
];
