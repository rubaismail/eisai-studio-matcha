import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { env } from '../config/env.js';

export type UploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const mimeByFormat: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function validateUploadFile(
  file: UploadFile | undefined,
): Promise<string> {
  if (!file) {
    const error = new Error('Image file required') as Error & {
      status?: number;
    };
    error.status = 400;
    throw error;
  }

  if (file.size > 5 * 1024 * 1024 || file.buffer.length > 5 * 1024 * 1024) {
    const error = new Error('Image exceeds the 5 MB limit') as Error & {
      status?: number;
    };
    error.status = 413;
    throw error;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Unsupported image type') as Error & {
      status?: number;
    };
    error.status = 415;
    throw error;
  }

  let actualMimeType: string | undefined;
  try {
    // Metadata alone does not decode pixels. Validate every frame with strict
    // decoder errors and Sharp's default input-size safeguards still enabled.
    const decoder = sharp(file.buffer, { failOn: 'warning', animated: true });
    const metadata = await decoder.metadata();
    actualMimeType = mimeByFormat[metadata.format ?? ''];
    if (!actualMimeType) throw new Error('Unsupported image format');
    // libpng can decode complete pixel data even when the mandatory closing
    // chunk is missing. Require the zero-length IEND chunk and its fixed CRC.
    if (
      metadata.format === 'png' &&
      !file.buffer
        .subarray(-12)
        .equals(Buffer.from('0000000049454e44ae426082', 'hex'))
    ) {
      throw new Error('Incomplete PNG');
    }
    await decoder.stats();
  } catch {
    const error = new Error('Unsupported image type') as Error & {
      status?: number;
    };
    error.status = 415;
    throw error;
  }

  if (actualMimeType !== file.mimetype) {
    const error = new Error(
      'Image content does not match the supplied MIME type',
    ) as Error & { status?: number };
    error.status = 415;
    throw error;
  }

  return actualMimeType;
}

export async function uploadMenuImage(file: UploadFile): Promise<string> {
  const actualMimeType = await validateUploadFile(file);
  const extension =
    actualMimeType === 'image/jpeg'
      ? 'jpg'
      : actualMimeType === 'image/png'
        ? 'png'
        : 'webp';

  const key = `menu/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const bucket = env.awsS3Bucket;
  const publicBase = (
    env.awsS3PublicUrl || `https://${bucket}.s3.${env.awsRegion}.amazonaws.com`
  ).replace(/\/$/, '');

  const client = new S3Client({
    region: env.awsRegion,
    ...(env.awsAccessKeyId && env.awsSecretAccessKey
      ? {
          credentials: {
            accessKeyId: env.awsAccessKeyId,
            secretAccessKey: env.awsSecretAccessKey,
            ...(env.awsSessionToken
              ? { sessionToken: env.awsSessionToken }
              : {}),
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
