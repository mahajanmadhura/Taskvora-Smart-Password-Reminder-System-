const db = require('../database');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

const FileController = {
  getUploadedFiles: async (req, res) => {
    try {
      const userId = req.user.id;
      const files = await db.getUploadedFiles(userId);
      res.json({ success: true, files });
    } catch (error) {
      console.error('Get uploaded files error:', error);
      res.status(500).json({ success: false, error: 'Failed to get uploaded files' });
    }
  },

  uploadFile: async (req, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Validate file type (Excel files)
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'text/csv'
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ success: false, error: 'Only Excel/CSV files are allowed' });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalname;
      const filename = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = path.join(__dirname, '../../uploads', filename);

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../../uploads');
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      // Save file to disk
      await fs.writeFile(filepath, file.buffer);

      // Save metadata to MongoDB
      const result = await db.addUploadedFile(userId, originalName, filepath, file.size);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          id: result._id.toString(),
          filename: originalName,
          size: file.size,
          uploaded_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload file: ' + error.message });
    }
  },

  downloadFile: async (req, res) => {
    try {
      let userId = req.user ? req.user.id : null;
      if (!userId) {
        // Try to get token from query param
        const token = req.query.token;
        if (!token) {
          return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      }
      const fileId = req.params.id;

      const file = await db.getUploadedFileById(fileId, userId);
      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      // Check if file exists on disk
      try {
        await fs.access(file.filepath);
      } catch {
        return res.status(404).json({ success: false, error: 'File not found on disk' });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Length', file.size || 0);

      const fileStream = fs.createReadStream(file.filepath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download file error:', error);
      res.status(500).json({ success: false, error: 'Failed to download file' });
    }
  },

  viewFile: async (req, res) => {
    try {
      const userId = req.user.id;
      const fileId = req.params.id;

      const file = await db.getUploadedFileById(fileId, userId);
      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      // Check if file exists on disk
      try {
        await fs.access(file.filepath);
      } catch {
        return res.status(404).json({ success: false, error: 'File not found on disk' });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

      const fileStream = fs.createReadStream(file.filepath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('View file error:', error);
      res.status(500).json({ success: false, error: 'Failed to view file' });
    }
  },

  deleteFile: async (req, res) => {
    try {
      const userId = req.user.id;
      const fileId = req.params.id;

      // Temporarily removed user_id filter for testing
      const file = await db.getUploadedFileById(fileId, userId);
      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      // Delete from disk if exists
      try {
        await fs.unlink(file.filepath);
      } catch (err) {
        console.warn('Failed to delete file from disk:', err.message);
      }

      // Delete from database
      await db.deleteUploadedFile(fileId, userId);

      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  }
};

module.exports = FileController;

