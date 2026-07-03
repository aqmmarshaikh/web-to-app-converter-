import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for icon uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image format: ${file.mimetype}. Accepted: PNG, JPG, JPEG, WEBP`));
    }
  },
  storage: multer.memoryStorage(),
});

/**
 * POST /api/icons/upload
 * Upload an app icon image. Validates dimensions and saves to tmp/icons/.
 */
router.post(
  '/upload',
  authenticate,
  upload.single('icon'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No icon file provided' });
        return;
      }

      // Validate image using sharp
      let metadata;
      try {
        metadata = await sharp(req.file.buffer).metadata();
      } catch {
        res.status(400).json({ success: false, error: 'Corrupted or unreadable image file' });
        return;
      }

      if (!metadata.width || !metadata.height) {
        res.status(400).json({ success: false, error: 'Could not determine image dimensions' });
        return;
      }

      if (metadata.width < 512 || metadata.height < 512) {
        res.status(400).json({
          success: false,
          error: `Image too small: ${metadata.width}×${metadata.height}. Minimum required: 512×512`,
        });
        return;
      }

      // Convert to PNG for consistency and save
      const iconDir = path.resolve('tmp/icons');
      await fs.mkdir(iconDir, { recursive: true });

      const fileId = crypto.randomUUID();
      const fileName = `${fileId}.png`;
      const filePath = path.join(iconDir, fileName);

      await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(filePath);

      logger.info(`Icon uploaded and saved: ${filePath} (original: ${metadata.width}×${metadata.height})`);

      res.json({
        success: true,
        data: {
          iconPath: filePath,
          width: metadata.width,
          height: metadata.height,
        },
      });
    } catch (error: any) {
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, error: 'File too large. Maximum size is 5MB' });
        return;
      }
      logger.error('Icon upload error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to process icon' });
    }
  }
);

export default router;
