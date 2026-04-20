const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Add new work note
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, content, note_date } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title and content are required' 
            });
        }

        console.log('Adding work note for userId:', userId, 'data:', { title, content, note_date });

        const note = await db.addWorkNote(userId, {
            title,
            content,
            note_date: note_date ? new Date(note_date + 'T00:00:00.000Z') : new Date()
        });
        console.log('Work note saved:', note._id);

        res.status(201).json({ 
            success: true, 
            message: 'Note saved successfully',
            note
        });
    } catch (err) {
        console.error('Add work note error:', err.message);
        console.error('Stack:', err.stack);
        res.status(500).json({ 
            success: false, 
            message: `Failed to add work note: ${err.message}`,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Get all notes for a user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await db.getWorkNotes(userId);
        res.json({ success: true, notes });
    } catch (err) {
        console.error('Get work notes error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get a single note by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const note = await db.getWorkNoteById(req.params.id, userId);
        
        if (!note) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
        
        res.json({ success: true, note });
    } catch (err) {
        console.error('Get work note error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update a note
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, content, note_date } = req.body;
        
        const note = await db.updateWorkNote(req.params.id, userId, {
            title,
            content,
            note_date
        });
        
        if (!note) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
        
        res.json({ success: true, message: 'Note updated', note });
    } catch (err) {
        console.error('Update work note error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a note
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.deleteWorkNote(req.params.id, userId);
        
        if (!result) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
        
        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (err) {
        console.error('Delete work note error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
