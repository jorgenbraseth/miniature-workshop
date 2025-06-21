import { APIGatewayProxyResult } from 'aws-lambda'
import { ApiResponse } from '../types'

export const createResponse = <T = unknown>(
  statusCode: number,
  body: ApiResponse<T>,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  }
}

export const successResponse = <T = unknown>(
  data: T,
  message?: string,
  statusCode = 200
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: true,
    data,
    message,
  })
}

export const errorResponse = (
  error: string,
  statusCode = 400,
  message?: string
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error,
    message,
  })
}

export const serverErrorResponse = (
  error: string = 'Internal server error'
): APIGatewayProxyResult => {
  return createResponse(500, {
    success: false,
    error,
  })
}

export const notFoundResponse = (resource: string = 'Resource'): APIGatewayProxyResult => {
  return createResponse(404, {
    success: false,
    error: `${resource} not found`,
  })
}

export const unauthorizedResponse = (message: string = 'Unauthorized'): APIGatewayProxyResult => {
  return createResponse(401, {
    success: false,
    error: message,
  })
}

export const validationErrorResponse = (errors: string[]): APIGatewayProxyResult => {
  return createResponse(400, {
    success: false,
    error: 'Validation failed',
    message: errors.join(', '),
  })
}
