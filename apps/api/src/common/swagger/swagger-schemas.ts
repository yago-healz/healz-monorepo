/**
 * Schemas reutilizáveis para documentação Swagger
 */

export const ErrorResponseSchema = {
  type: "object",
  properties: {
    statusCode: {
      type: "number",
      example: 400,
      description: "Código de status HTTP",
    },
    message: {
      oneOf: [
        { type: "string", example: "Validation failed" },
        {
          type: "array",
          items: { type: "string" },
          example: ["email must be an email", "password must be at least 8 characters"],
        },
      ],
      description: "Mensagem de erro ou array de mensagens de validação",
    },
    error: {
      type: "string",
      example: "Bad Request",
      description: "Nome do erro HTTP",
    },
  },
};

export const UnauthorizedResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 401 },
    message: { type: "string", example: "Unauthorized" },
    error: { type: "string", example: "Unauthorized" },
  },
};

export const ForbiddenResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 403 },
    message: { type: "string", example: "Forbidden resource" },
    error: { type: "string", example: "Forbidden" },
  },
};

export const NotFoundResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 404 },
    message: { type: "string", example: "Resource not found" },
    error: { type: "string", example: "Not Found" },
  },
};

export const TooManyRequestsResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 429 },
    message: { type: "string", example: "ThrottlerException: Too Many Requests" },
    error: { type: "string", example: "Too Many Requests" },
  },
};

export const InternalServerErrorResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 500 },
    message: { type: "string", example: "Internal server error" },
    error: { type: "string", example: "Internal Server Error" },
  },
};

/**
 * Schema para respostas de sucesso simples com mensagem
 */
export const MessageResponseSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      example: "Operation completed successfully",
    },
  },
};

/**
 * Schema para respostas paginadas
 */
export const PaginatedResponseSchema = (itemSchema: any) => ({
  type: "object",
  properties: {
    data: {
      type: "array",
      items: itemSchema,
    },
    meta: {
      type: "object",
      properties: {
        total: { type: "number", example: 150 },
        page: { type: "number", example: 1 },
        limit: { type: "number", example: 20 },
        hasMore: { type: "boolean", example: true },
        totalPages: { type: "number", example: 8 },
      },
    },
  },
});
