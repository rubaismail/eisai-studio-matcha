import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export type UploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function detectActualMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }

  return null;
}

export function validateUploadFile(file: UploadFile | undefined) {
  if (!file) {
    const error = new Error('Image file required') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (file.size > 5 * 1024 * 1024) {
    const error = new Error('Image exceeds the 5 MB limit') as Error & { status?: number };
    error.status = 413;
    throw error;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Unsupported image type') as Error & { status?: number };
    error.status = 415;
    throw error;
  }

  const actualMimeType = detectActualMimeType(file.buffer);
  if (!actualMimeType || !allowedMimeTypes.has(actualMimeType)) {
    const error = new Error('Unsupported image type') as Error & { status?: number };
    error.status = 415;
    throw error;
  }

  if (actualMimeType !== file.mimetype) {
    const error = new Error('Image content does not match the supplied MIME type') as Error & { status?: number };
    error.status = 415;
    throw error;
  }
}

export async function uploadMenuImage(file: UploadFile): Promise<string> {
  validateUploadFile(file);

  const actualMimeType = detectActualMimeType(file.buffer) ?? file.mimetype;
  const extension = actualMimeType === 'image/jpeg'
    ? 'jpg'
    : actualMimeType === 'image/png'
      ? 'png'
      : 'webp';

  const key = `menu/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const bucket = env.awsS3Bucket;
  const publicBase = (env.awsS3PublicUrl || `https://${bucket}.s3.${env.awsRegion}.amazonaws.com`).replace(/\/$/, '');

  const client = new S3Client({
    region: env.awsRegion,
    ...(env.awsAccessKeyId && env.awsSecretAccessKey
      ? {
          credentials: {
            accessKeyId: env.awsAccessKeyId,
            secretAccessKey: env.awsSecretAccessKey,
          },
        }
      : {}),
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: actualMimeType,
    }),
  );

  return `${publicBase}/${key}`;
}
