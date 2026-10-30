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

function isValidPng(buffer: Buffer): boolean {
  if (buffer.length < 33) {
    return false;
  }

  if (
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer[4] !== 0x0d ||
    buffer[5] !== 0x0a ||
    buffer[6] !== 0x1a ||
    buffer[7] !== 0x0a
  ) {
    return false;
  }

  if (buffer.readUInt32BE(8) !== 13 || buffer.slice(12, 16).toString('ascii') !== 'IHDR') {
    return false;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return width > 0 && height > 0;
}

function isValidJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    (buffer[3] >= 0xe0 && buffer[3] <= 0xef);
}

function isValidWebp(buffer: Buffer): boolean {
  if (buffer.length < 12) {
    return false;
  }

  if (
    buffer[0] !== 0x52 ||
    buffer[1] !== 0x49 ||
    buffer[2] !== 0x46 ||
    buffer[3] !== 0x46 ||
    buffer[8] !== 0x57 ||
    buffer[9] !== 0x45 ||
    buffer[10] !== 0x42 ||
    buffer[11] !== 0x50
  ) {
    return false;
  }

  const riffSize = buffer.readUInt32LE(4);
  return riffSize > 0 && buffer.length >= 12 + riffSize;
}

function detectActualMimeType(buffer: Buffer): string | null {
  if (isValidPng(buffer)) {
    return 'image/png';
  }

  if (isValidJpeg(buffer)) {
    return 'image/jpeg';
  }

  if (isValidWebp(buffer)) {
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
            ...(env.awsSessionToken ? { sessionToken: env.awsSessionToken } : {}),
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
