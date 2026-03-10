const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { authenticate } = require('../../../../shared/middleware');

// Configuration des dossiers d'upload
let uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
const dirs = ['images', 'thumbnails', 'audio', 'video', 'documents', 'verification'];

const ensureUploadDirs = (baseDir) => {
  dirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

try {
  ensureUploadDirs(uploadDir);
} catch (err) {
  const fallbackDir = path.join(process.cwd(), 'uploads');
  try {
    ensureUploadDirs(fallbackDir);
    uploadDir = fallbackDir;
    console.warn('Upload path not writable, falling back to local uploads directory:', {
      attempted: process.env.UPLOAD_PATH,
      fallback: fallbackDir,
      error: err?.message,
    });
  } catch (fallbackErr) {
    console.error('Failed to initialize upload directories:', {
      attempted: uploadDir,
      fallback: fallbackDir,
      error: err?.message,
      fallbackError: fallbackErr?.message,
    });
    throw fallbackErr;
  }
}

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
      // Certains navigateurs envoient des webm avec un mimetype incorrect (ex: text/plain)
      // Dans ce cas, on infère via la route si possible, sinon audio par défaut.
      folder = route.includes('/api/upload/video') ? 'video' : 'audio';
    }

    if (req.body.purpose === 'verification') folder = 'verification';

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
  const route = req.originalUrl || '';
  const isAudioRoute = route.includes('/api/upload/audio');
  const isVideoRoute = route.includes('/api/upload/video');

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedMediaExt = ['.webm', '.wav', '.ogg', '.mp3', '.mp4', '.mov', '.m4a', '.aac', '.3gp', '.amr'];
  const fallbackTypes = ['application/octet-stream', 'text/plain', 'application/x-empty', 'application/octet'];

  // Images : liste stricte
  if (isAudioRoute || isVideoRoute) {
    // Audio/vidéo : accepter tout type audio/ ou video/ (iOS envoie parfois video/mp4 pour l'audio)
    if (normalizedType.startsWith('audio/') || normalizedType.startsWith('video/')) {
      return cb(null, true);
    }
    // Fallback pour navigateurs qui envoient application/octet-stream ou text/plain
    if (fallbackTypes.includes(normalizedType) && allowedMediaExt.includes(ext)) {
      return cb(null, true);
    }
  } else {
    if (allowedImageTypes.includes(normalizedType)) {
      return cb(null, true);
    }
    // Vérification / multiple : aussi PDF et images octet-stream
    if (normalizedType === 'application/octet-stream' && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext)) {
      return cb(null, true);
    }
  }

  console.warn('Upload rejected:', {
    mimetype: file.mimetype,
    normalizedType,
    originalname: file.originalname,
    ext,
    route: req.originalUrl,
  });
  cb(new Error('Type de fichier non autorisé'), false);
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

    // Créer une miniature
    const thumbnailName = `thumb_${req.file.filename}`;
    const thumbnailPath = path.join(uploadDir, 'thumbnails', thumbnailName);

    await sharp(req.file.path)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      url: `${baseUrl}/uploads/images/${req.file.filename}`,
      thumbnail: `${baseUrl}/uploads/thumbnails/${thumbnailName}`,
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

    res.json({
      url: `${baseUrl}/uploads/audio/${req.file.filename}`,
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

    res.json({
      url: `${baseUrl}/uploads/video/${req.file.filename}`,
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

    const files = req.files.map(file => ({
      url: `${baseUrl}/uploads/verification/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json({ files });
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

    res.json({ files: results });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

module.exports = router;
