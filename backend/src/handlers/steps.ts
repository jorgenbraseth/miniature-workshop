import { APIGatewayProxyHandler } from 'aws-lambda'
import { requireAuth } from '../utils/auth'
import { getUnit as getUnitFromDb, updateUnit as updateUnitInDb } from '../services/dynamodb'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '../utils/response'
import { CreateStepRequest, UpdateStepRequest, Step } from '../types'
import { v4 as uuidv4 } from 'uuid'
import Joi from 'joi'

const createStepSchema = Joi.object({
  stepNumber: Joi.number().integer().min(1).required(),
  technique: Joi.array().items(Joi.string()).required(),
  description: Joi.string().required().min(1).max(1000),
  paints: Joi.array().items(Joi.object()).required(),
  paintMix: Joi.object().optional(),
  brushes: Joi.array().items(Joi.object()).required(),
  otherTools: Joi.array().items(Joi.string()).required(),
  appliedToModels: Joi.array().items(Joi.string()).required(),
})

const updateStepSchema = Joi.object({
  stepNumber: Joi.number().integer().min(1).optional(),
  technique: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().optional().min(1).max(1000),
  paints: Joi.array().items(Joi.object()).optional(),
  paintMix: Joi.object().optional(),
  brushes: Joi.array().items(Joi.object()).optional(),
  otherTools: Joi.array().items(Joi.string()).optional(),
  appliedToModels: Joi.array().items(Joi.string()).optional(),
})

export const createStep: APIGatewayProxyHandler = async event => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization
    const authUser = await requireAuth(authHeader)

    const unitId = event.pathParameters?.unitId
    if (!unitId) {
      return errorResponse('Unit ID is required')
    }

    // Check if unit exists and user owns it
    const unit = await getUnitFromDb(unitId)
    if (!unit) {
      return notFoundResponse('Unit')
    }

    if (unit.userId !== authUser.id) {
      return unauthorizedResponse('Access denied')
    }

    const body = JSON.parse(event.body || '{}')
    const { error, value } = createStepSchema.validate(body)

    if (error) {
      return errorResponse('Validation failed', 400, error.details.map(d => d.message).join(', '))
    }

    const stepData: CreateStepRequest = value

    const newStep: Step = {
      id: uuidv4(),
      ...stepData,
      timestamp: new Date().toISOString(),
      photos: [], // Photos will be added separately via image upload
    }

    // Add step to unit
    const updatedSteps = [...unit.steps, newStep]
    await updateUnitInDb(unitId, { steps: updatedSteps })

    return successResponse(newStep, 'Step created successfully', 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse()
    }
    console.error('Error creating step:', error)
    return serverErrorResponse()
  }
}

export const updateStep: APIGatewayProxyHandler = async event => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization
    const authUser = await requireAuth(authHeader)

    const unitId = event.pathParameters?.unitId
    const stepId = event.pathParameters?.stepId

    if (!unitId || !stepId) {
      return errorResponse('Unit ID and Step ID are required')
    }

    // Check if unit exists and user owns it
    const unit = await getUnitFromDb(unitId)
    if (!unit) {
      return notFoundResponse('Unit')
    }

    if (unit.userId !== authUser.id) {
      return unauthorizedResponse('Access denied')
    }

    // Find the step
    const stepIndex = unit.steps.findIndex(s => s.id === stepId)
    if (stepIndex === -1) {
      return notFoundResponse('Step')
    }

    const body = JSON.parse(event.body || '{}')
    const { error, value } = updateStepSchema.validate(body)

    if (error) {
      return errorResponse('Validation failed', 400, error.details.map(d => d.message).join(', '))
    }

    const updates: UpdateStepRequest = value

    // Update the step
    const updatedSteps = [...unit.steps]
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      ...updates,
    }

    await updateUnitInDb(unitId, { steps: updatedSteps })

    return successResponse(updatedSteps[stepIndex], 'Step updated successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse()
    }
    console.error('Error updating step:', error)
    return serverErrorResponse()
  }
}

export const deleteStep: APIGatewayProxyHandler = async event => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization
    const authUser = await requireAuth(authHeader)

    const unitId = event.pathParameters?.unitId
    const stepId = event.pathParameters?.stepId

    if (!unitId || !stepId) {
      return errorResponse('Unit ID and Step ID are required')
    }

    // Check if unit exists and user owns it
    const unit = await getUnitFromDb(unitId)
    if (!unit) {
      return notFoundResponse('Unit')
    }

    if (unit.userId !== authUser.id) {
      return unauthorizedResponse('Access denied')
    }

    // Find and remove the step
    const updatedSteps = unit.steps.filter(s => s.id !== stepId)

    if (updatedSteps.length === unit.steps.length) {
      return notFoundResponse('Step')
    }

    await updateUnitInDb(unitId, { steps: updatedSteps })

    return successResponse(null, 'Step deleted successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse()
    }
    console.error('Error deleting step:', error)
    return serverErrorResponse()
  }
}
