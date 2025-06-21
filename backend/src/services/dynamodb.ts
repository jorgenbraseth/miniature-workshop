import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Unit, User, SyncQueueItem, UnitDynamoItem, UserDynamoItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(client);

const UNITS_TABLE = process.env.UNITS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const SYNC_QUEUE_TABLE = process.env.SYNC_QUEUE_TABLE!;

// Unit operations
export const getUnit = async (id: string): Promise<Unit | null> => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: UNITS_TABLE,
        Key: { id },
      })
    );

    if (!result.Item) {
      return null;
    }

    return transformDynamoItemToUnit(result.Item as UnitDynamoItem);
  } catch (error) {
    console.error('Error getting unit:', error);
    throw error;
  }
};

export const getUserUnits = async (userId: string, limit = 50, nextToken?: string): Promise<{
  units: Unit[];
  nextToken?: string;
}> => {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: UNITS_TABLE,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      })
    );

    const units = result.Items?.map(item => transformDynamoItemToUnit(item as UnitDynamoItem)) || [];
    
    return {
      units,
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  } catch (error) {
    console.error('Error getting user units:', error);
    throw error;
  }
};

export const getPublicUnits = async (limit = 50, nextToken?: string): Promise<{
  units: Unit[];
  nextToken?: string;
}> => {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: UNITS_TABLE,
        IndexName: 'PublicIndex',
        KeyConditionExpression: 'isPublic = :isPublic',
        ExpressionAttributeValues: {
          ':isPublic': 'true',
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      })
    );

    const units = result.Items?.map(item => transformDynamoItemToUnit(item as UnitDynamoItem)) || [];
    
    return {
      units,
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  } catch (error) {
    console.error('Error getting public units:', error);
    throw error;
  }
};

export const createUnit = async (unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Unit> => {
  const now = new Date().toISOString();
  const id = uuidv4();
  
  const newUnit: Unit = {
    ...unit,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const dynamoItem = transformUnitToDynamoItem(newUnit);

  try {
    await docClient.send(
      new PutCommand({
        TableName: UNITS_TABLE,
        Item: dynamoItem,
      })
    );

    return newUnit;
  } catch (error) {
    console.error('Error creating unit:', error);
    throw error;
  }
};

export const updateUnit = async (id: string, updates: Partial<Unit>): Promise<Unit> => {
  const now = new Date().toISOString();
  
  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  // Handle GSI fields that need special formatting
  if (updates.userId !== undefined) {
    updateExpressions.push('#GSI1PK = :GSI1PK');
    expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
    expressionAttributeValues[':GSI1PK'] = updates.userId;
    
    // Only update GSI1SK if createdAt is explicitly being updated
    if (updates.createdAt !== undefined) {
      updateExpressions.push('#GSI1SK = :GSI1SK');
      expressionAttributeNames['#GSI1SK'] = 'GSI1SK';
      expressionAttributeValues[':GSI1SK'] = updates.createdAt;
    }
  }

  // Handle isPublic conversion to string (no GSI2 fields since PublicIndex uses isPublic directly)
  if (updates.isPublic !== undefined) {
    // Override the isPublic value to be a string instead of boolean
    expressionAttributeValues[':isPublic'] = updates.isPublic.toString();
  }

  // Always update updatedAt
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = now;

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: UNITS_TABLE,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      throw new Error('Unit not found');
    }

    return transformDynamoItemToUnit(result.Attributes as UnitDynamoItem);
  } catch (error) {
    console.error('Error updating unit:', error);
    throw error;
  }
};

export const deleteUnit = async (id: string): Promise<void> => {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: UNITS_TABLE,
        Key: { id },
      })
    );
  } catch (error) {
    console.error('Error deleting unit:', error);
    throw error;
  }
};

// User operations
export const getUser = async (id: string): Promise<User | null> => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { id },
      })
    );

    if (!result.Item) {
      return null;
    }

    return transformDynamoItemToUser(result.Item as UserDynamoItem);
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return transformDynamoItemToUser(result.Items[0] as UserDynamoItem);
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

export const createUnitWithId = async (unit: Unit): Promise<Unit> => {
  const now = new Date().toISOString();
  
  const newUnit: Unit = {
    ...unit,
    createdAt: unit.createdAt || now,
    updatedAt: now,
  };

  const dynamoItem = transformUnitToDynamoItem(newUnit);

  try {
    await docClient.send(
      new PutCommand({
        TableName: UNITS_TABLE,
        Item: dynamoItem,
      })
    );

    return newUnit;
  } catch (error) {
    console.error('Error creating unit with ID:', error);
    throw error;
  }
};

export const createUser = async (user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> => {
  const now = new Date().toISOString();
  
  const newUser: User = {
    ...user,
    createdAt: now,
    updatedAt: now,
  };

  const dynamoItem = transformUserToDynamoItem(newUser);

  try {
    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: dynamoItem,
      })
    );

    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Helper functions to transform between API types and DynamoDB items
const transformUnitToDynamoItem = (unit: Unit): UnitDynamoItem => {
  return {
    ...unit,
    // Convert boolean to string for the isPublic field to match the existing index
    isPublic: unit.isPublic.toString(),
    GSI1PK: unit.userId,
    GSI1SK: unit.createdAt,
  };
};

const transformDynamoItemToUnit = (item: UnitDynamoItem): Unit => {
  const { GSI1PK, GSI1SK, ...unitWithStringIsPublic } = item;
  return {
    ...unitWithStringIsPublic,
    // Convert string back to boolean for the API response
    isPublic: unitWithStringIsPublic.isPublic === 'true',
  };
};

const transformUserToDynamoItem = (user: User): UserDynamoItem => {
  return {
    ...user,
    GSI1PK: user.email,
  };
};

const transformDynamoItemToUser = (item: UserDynamoItem): User => {
  const { GSI1PK, ...user } = item;
  return user;
}; 