const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const { authenticate } = require('../../../../shared/middleware');

// Configuration des dossiers d'upload
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
const dirs = ['images', 'thumbnails', 'audio', 'video', 'documents', 'verification'];
dirs.forEach(dir => {
  const fullPath = path.join(uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const hasR2 = Boolean(
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET
);

const r2Client = hasR2
  ? new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })
  : null;

const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL
  ? process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')
  : '';

const inferExtension = (mimetype, originalname) => {
  const ext = path.extname(originalname || '').toLowerCase();
  if (ext) return ext;
  const normalizedType = (mimetype || '').split(';')[0].trim().toLowerCase();
  if (normalizedType === 'image/jpeg') return '.jpg';
  if (normalizedType === 'image/png') return '.png';
  if (normalizedType === 'image/gif') return '.gif';
  if (normalizedType === 'image/webp') return '.webp';
  if (normalizedType === 'audio/mpeg') return '.mp3';
  if (normalizedType === 'audio/wav') return '.wav';
  if (normalizedType === 'audio/ogg') return '.ogg';
  if (normalizedType === 'audio/webm') return '.webm';
  if (normalizedType === 'video/mp4') return '.mp4';
  if (normalizedType === 'video/webm') return '.webm';
  if (normalizedType === 'video/quicktime') return '.mov';
  return '';
};

const resolveFolder = (req, file) => {
  let folder = 'documents';
  const route = req.originalUrl || '';
  const normalizedType = (file.mimetype || '').split(';')[0].trim().toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (route.includes('/api/upload/video')) {
    folder = 'video';
  } else if (route.includes('/api/upload/audio')) {
    folder = 'audio';
  } else if (route.includes('/api/upload/image')) {
    folder = 'images';
  } else if (normalizedType.startsWith('image/')) {
    folder = 'images';
  } else if (normalizedType.startsWith('audio/')) {
    folder = 'audio';
  } else if (normalizedType.startsWith('video/')) {
    folder = 'video';
  } else if (ext === '.webm') {
    folder = route.includes('/api/upload/video') ? 'video' : 'audio';
  }

  if (req.body.purpose === 'verification') folder = 'verification';

  return folder;
};

const r2PutObject = async ({ key, body, contentType }) => {
  if (!r2Client) throw new Error('R2 client not configured');
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  return {
    key,
    url: r2PublicBaseUrl ? `${r2PublicBaseUrl}/${key}` : null,
  };
};

// Configuration Multer
const storage = hasR2
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (req, file, cb) => {
      const folder = resolveFolder(req, file);
      cb(null, path.join(uploadDir, folder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

const fileFilter = (req, file, cb) => {
  const normalizedType = (file.mimetype || '').split(';')[0].trim().toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];

  const allowedExtForOctetStream = ['.webm', '.wav', '.ogg', '.mp3', '.mp4', '.mov', '.m4a', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const route = req.originalUrl || '';
  const isAudioRoute = route.includes('/api/upload/audio');
  const isVideoRoute = route.includes('/api/upload/video');
  const allowedAudioExt = ['.webm', '.wav', '.ogg', '.mp3', '.m4a'];
  const allowedVideoExt = ['.webm', '.mp4', '.mov'];

  if (allowedTypes.includes(normalizedType)) {
    cb(null, true);
  } else if (normalizedType === 'application/octet-stream' && allowedExtForOctetStream.includes(ext)) {
    cb(null, true);
  } else if ((normalizedType === 'text/plain' || normalizedType === 'application/x-empty') && ((isAudioRoute && allowedAudioExt.includes(ext)) || (isVideoRoute && allowedVideoExt.includes(ext)))) {
    cb(null, true);
  } else {
    console.warn('Upload rejected:', {
      mimetype: file.mimetype,
      normalizedType,
      originalname: file.originalname,
      ext,
      route: req.originalUrl,
    });
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10 Mo
  },
});

// POST /api/upload/image - Upload d'une image
router.post('/image', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (!hasR2) {
      const thumbnailName = `thumb_${req.file.filename}`;
      const thumbnailPath = path.join(uploadDir, 'thumbnails', thumbnailName);

      await sharp(req.file.path)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return res.json({
        url: `${baseUrl}/uploads/images/${req.file.filename}`,
        thumbnail: `${baseUrl}/uploads/thumbnails/${thumbnailName}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    }

    if (!r2PublicBaseUrl) {
      return res.status(500).json({ error: 'R2_PUBLIC_BASE_URL manquant' });
    }

    const ext = inferExtension(req.file.mimetype, req.file.originalname) || '.bin';
    const objectName = `${uuidv4()}${ext}`;
    const originalKey = `uploads/images/${objectName}`;
    const thumbKey = `uploads/thumbnails/thumb_${objectName.replace(/[^a-zA-Z0-9_.-]/g, '')}.jpg`;

    const originalBuffer = req.file.buffer;
    const thumbBuffer = await sharp(originalBuffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const [originalPut, thumbPut] = await Promise.all([
      r2PutObject({ key: originalKey, body: originalBuffer, contentType: req.file.mimetype }),
      r2PutObject({ key: thumbKey, body: thumbBuffer, contentType: 'image/jpeg' }),
    ]);

    res.json({
      url: originalPut.url,
      thumbnail: thumbPut.url,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
  }
});

// POST /api/upload/audio - Upload d'un audio
router.post('/audio', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (!hasR2) {
      return res.json({
        url: `${baseUrl}/uploads/audio/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        duration: req.body.duration ? parseFloat(req.body.duration) : null,
      });
    }

    if (!r2PublicBaseUrl) {
      return res.status(500).json({ error: 'R2_PUBLIC_BASE_URL manquant' });
    }

    const ext = inferExtension(req.file.mimetype, req.file.originalname) || '.bin';
    const objectName = `${uuidv4()}${ext}`;
    const key = `uploads/audio/${objectName}`;
    const put = await r2PutObject({ key, body: req.file.buffer, contentType: req.file.mimetype });

    res.json({
      url: put.url,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      duration: req.body.duration ? parseFloat(req.body.duration) : null,
    });
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de l\'audio' });
  }
});

// POST /api/upload/video - Upload d'une vidéo courte
router.post('/video', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (!hasR2) {
      return res.json({
        url: `${baseUrl}/uploads/video/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        duration: req.body.duration ? parseFloat(req.body.duration) : null,
      });
    }

    if (!r2PublicBaseUrl) {
      return res.status(500).json({ error: 'R2_PUBLIC_BASE_URL manquant' });
    }

    const ext = inferExtension(req.file.mimetype, req.file.originalname) || '.bin';
    const objectName = `${uuidv4()}${ext}`;
    const key = `uploads/video/${objectName}`;
    const put = await r2PutObject({ key, body: req.file.buffer, contentType: req.file.mimetype });

    res.json({
      url: put.url,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      duration: req.body.duration ? parseFloat(req.body.duration) : null,
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de la vidéo' });
  }
});

// POST /api/upload/verification - Upload de documents de vérification
router.post('/verification', authenticate, upload.array('files', 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (!hasR2) {
      const files = req.files.map(file => ({
        url: `${baseUrl}/uploads/verification/${file.filename}`,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      }));
      return res.json({ files });
    }

    if (!r2PublicBaseUrl) {
      return res.status(500).json({ error: 'R2_PUBLIC_BASE_URL manquant' });
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const ext = inferExtension(file.mimetype, file.originalname) || '.bin';
        const objectName = `${uuidv4()}${ext}`;
        const key = `uploads/verification/${objectName}`;
        const put = await r2PutObject({ key, body: file.buffer, contentType: file.mimetype });
        return {
          url: put.url,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        };
      })
    );

    res.json({ files: results });
  } catch (error) {
    console.error('Upload verification error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// POST /api/upload/multiple - Upload multiple d'images
router.post('/multiple', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (!hasR2) {
      const results = [];

      for (const file of req.files) {
        let thumbnail = null;

        if (file.mimetype.startsWith('image/')) {
          const thumbnailName = `thumb_${file.filename}`;
          const thumbnailPath = path.join(uploadDir, 'thumbnails', thumbnailName);

          await sharp(file.path)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

          thumbnail = `${baseUrl}/uploads/thumbnails/${thumbnailName}`;
        }

        results.push({
          url: `${baseUrl}/uploads/images/${file.filename}`,
          thumbnail,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        });
      }

      return res.json({ files: results });
    }

    if (!r2PublicBaseUrl) {
      return res.status(500).json({ error: 'R2_PUBLIC_BASE_URL manquant' });
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const ext = inferExtension(file.mimetype, file.originalname) || '.bin';
        const objectName = `${uuidv4()}${ext}`;
        const originalKey = `uploads/images/${objectName}`;
        let thumbnail = null;

        await r2PutObject({ key: originalKey, body: file.buffer, contentType: file.mimetype });

        if ((file.mimetype || '').startsWith('image/')) {
          const thumbKey = `uploads/thumbnails/thumb_${objectName.replace(/[^a-zA-Z0-9_.-]/g, '')}.jpg`;
          const thumbBuffer = await sharp(file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();
          const putThumb = await r2PutObject({ key: thumbKey, body: thumbBuffer, contentType: 'image/jpeg' });
          thumbnail = putThumb.url;
        }

        return {
          url: `${r2PublicBaseUrl}/${originalKey}`,
          thumbnail,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        };
      })
    );

    res.json({ files: results });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

module.exports = router;
