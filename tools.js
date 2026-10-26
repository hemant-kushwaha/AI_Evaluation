const orders = {
  ORD101: {
    status: "Shipped",
    deliveryDate: "2026-10-28",
    amount: 1200,
  },
  ORD102: {
    status: "Delivered",
    deliveryDate: "2026-10-24",
    amount: 800,
  },
};

export const tools = [
  {
    type: "function",
    name: "getOrderStatus",
    description: "Get the current status of an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The order ID",
        },
      },
      required: ["orderId"],
    },
  },
  {
    type: "function",
    name: "getDeliveryDate",
    description: "Get the estimated delivery date of an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
      },
      required: ["orderId"],
    },
  },
  {
    type: "function",
    name: "getRefundAmount",
    description: "Get the amount paid for an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
      },
      required: ["orderId"],
    },
  },
];

export async function executeTool(name, args) {
  const order = orders[args.orderId];

  if (!order) {
    return { error: "Order not found" };
  }

  switch (name) {
    case "getOrderStatus":
      return { status: order.status };

    case "getDeliveryDate":
      return { deliveryDate: order.deliveryDate };

    case "getRefundAmount":
      return { amount: order.amount };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
