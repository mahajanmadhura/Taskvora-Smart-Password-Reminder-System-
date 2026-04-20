const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// Routes
router.get('/', authMiddleware, fileController.getUploadedFiles);
router.post('/upload', authMiddleware, upload.single('excelFile'), fileController.uploadFile);
router.get('/:id/download', authMiddleware, fileController.downloadFile);
router.get('/:id/view', authMiddleware, fileController.viewFile);
router.delete('/:id', authMiddleware, fileController.deleteFile);

module.exports = router;
