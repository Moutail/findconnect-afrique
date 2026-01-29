const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { auth } = require('../middleware/auth');
const { upload, handleUploadError, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// POST /api/upload/image - Upload d'une image
router.post('/image', auth, upload.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const originalPath = req.file.path;
    const filename = req.file.filename;
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    
    // Créer une miniature
    const thumbnailFilename = `${basename}_thumb${ext}`;
    const thumbnailPath = path.join(path.dirname(originalPath), thumbnailFilename);
    
    await sharp(originalPath)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Optimiser l'image originale
    const optimizedPath = originalPath.replace(ext, '_opt' + ext);
    await sharp(originalPath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);
    
    // Remplacer l'original par l'optimisé
    fs.unlinkSync(originalPath);
    fs.renameSync(optimizedPath, originalPath);
    
    res.json({
      url: getFileUrl(req, filename, 'images'),
      thumbnail: getFileUrl(req, thumbnailFilename, 'images'),
      filename,
    });
    
  } catch (error) {
    console.error('Erreur upload image:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
  }
});

// POST /api/upload/images - Upload multiple d'images
router.post('/images', auth, upload.array('images', 5), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const originalPath = file.path;
        const filename = file.filename;
        const ext = path.extname(filename);
        const basename = path.basename(filename, ext);
        
        // Créer une miniature
        const thumbnailFilename = `${basename}_thumb${ext}`;
        const thumbnailPath = path.join(path.dirname(originalPath), thumbnailFilename);
        
        await sharp(originalPath)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        
        // Optimiser l'image originale
        const optimizedPath = originalPath.replace(ext, '_opt' + ext);
        await sharp(originalPath)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(optimizedPath);
        
        fs.unlinkSync(originalPath);
        fs.renameSync(optimizedPath, originalPath);
        
        return {
          url: getFileUrl(req, filename, 'images'),
          thumbnail: getFileUrl(req, thumbnailFilename, 'images'),
          filename,
        };
      })
    );
    
    res.json({ images: uploadedImages });
    
  } catch (error) {
    console.error('Erreur upload images:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des images' });
  }
});

// POST /api/upload/document - Upload d'un document
router.post('/document', auth, upload.single('document'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    res.json({
      url: getFileUrl(req, req.file.filename, 'documents'),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
    
  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du document' });
  }
});

// DELETE /api/upload/:type/:filename - Supprimer un fichier
router.delete('/:type/:filename', auth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!['images', 'documents'].includes(type)) {
      return res.status(400).json({ error: 'Type de fichier invalide' });
    }
    
    // Sécurité: empêcher la traversée de répertoire
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, '../../uploads', type, safeFilename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    
    fs.unlinkSync(filePath);
    
    // Supprimer aussi la miniature si c'est une image
    if (type === 'images') {
      const ext = path.extname(safeFilename);
      const basename = path.basename(safeFilename, ext);
      const thumbnailPath = path.join(__dirname, '../../uploads', type, `${basename}_thumb${ext}`);
      
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    
    res.json({ message: 'Fichier supprimé' });
    
  } catch (error) {
    console.error('Erreur delete file:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
});

module.exports = router;
