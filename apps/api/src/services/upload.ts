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

export function validateUploadFile(file: UploadFile | undefined) {
  if (!file) {
    const error = new Error('Image file required') as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Unsupported image type') as Error & { status?: number };
    error.status = 415;
    throw error;
  }

  if (file.size > 5 * 1024 * 1024) {
    const error = new Error('Image exceeds the 5 MB limit') as Error & { status?: number };
    error.status = 413;
    throw error;
  }
}

export async function uploadMenuImage(file: UploadFile): Promise<string> {
  validateUploadFile(file);

  const extension = file.mimetype === 'image/jpeg'
    ? 'jpg'
    : file.mimetype === 'image/png'
      ? 'png'
      : 'webp';

  const key = `menu/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const bucket = env.awsS3Bucket;
  const publicBase = (env.awsS3PublicUrl || `https://${bucket}.s3.${env.awsRegion}.amazonaws.com`).replace(/\/$/, '');

  if (!env.awsAccessKeyId || !env.awsSecretAccessKey) {
    return `${publicBase}/${key}`;
  }

  const client = new S3Client({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }),
  );

  return `${publicBase}/${key}`;
}
