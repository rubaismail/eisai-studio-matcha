import { Router } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { requireAdmin } from '../middleware/auth.js';
import { uploadMenuImage, type UploadFile } from '../services/upload.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const accepted = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!accepted) {
      const error = new Error('Unsupported image type') as Error & { status?: number };
      error.status = 415;
      cb(error);
      return;
    }

    cb(null, true);
  },
});

const router = Router();

router.post('/', requireAdmin, (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
          const error = new Error(
            err.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 5 MB limit' : 'Unexpected file upload',
          ) as Error & { status?: number };
          error.status = status;
          throw error;
        }

        throw err;
      }

      const file = req.file as UploadFile | undefined;
      if (!file) {
        const error = new Error('Image file required') as Error & { status?: number };
        error.status = 400;
        throw error;
      }

      const imageUrl = await uploadMenuImage(file);
      res.status(201).json({ imageUrl });
    } catch (error) {
      next(error);
    }
  });
});

export default router;
