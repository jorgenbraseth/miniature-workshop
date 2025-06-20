import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '../utils/auth';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '../utils/response';
import { UploadImageRequest, UploadImageResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

const s3Client = new S3Client({
  region: process.env.REGION || 'us-east-1',
});

const IMAGES_BUCKET = process.env.IMAGES_BUCKET!;

const uploadImageSchema = Joi.object({
  type: Joi.string().valid('detail', 'full_model', 'unit_overview').required(),
  description: Joi.string().required().min(1).max(200),
  isPublic: Joi.boolean().required(),
});

export const getUploadUrl: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    const body = JSON.parse(event.body || '{}');
    const { error, value } = uploadImageSchema.validate(body);
    
    if (error) {
      return errorResponse('Validation failed', 400, error.details.map(d => d.message).join(', '));
    }

    const imageData: UploadImageRequest = value;
    const imageId = uuidv4();
    const s3Key = `images/${authUser.id}/${imageId}.jpg`;
    
    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: IMAGES_BUCKET,
      Key: s3Key,
      ContentType: 'image/jpeg',
      Metadata: {
        userId: authUser.id,
        imageId,
        type: imageData.type,
        description: imageData.description,
        isPublic: imageData.isPublic.toString(),
      },
      ...(imageData.isPublic && {
        Tagging: 'public=true',
      }),
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    const response: UploadImageResponse = {
      uploadUrl,
      imageId,
      s3Key,
    };

    return successResponse(response, 'Upload URL generated successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error generating upload URL:', error);
    return serverErrorResponse();
  }
};

export const uploadImage: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    // This endpoint would handle direct image upload
    // For now, we'll use the presigned URL approach above
    // This could be extended to handle multipart uploads or image processing

    return successResponse(
      { message: 'Use the /images/upload-url endpoint to get a presigned URL for upload' },
      'Direct upload not implemented'
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error uploading image:', error);
    return serverErrorResponse();
  }
}; 