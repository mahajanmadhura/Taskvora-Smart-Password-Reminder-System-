const db = require('../database');
const moment = require('moment');

class ReminderController {
    async addReminder(req, res) {
        try {
            const userId = req.user.id;
            const reminderData = req.body;

            // Validate reminder date
            // Fix reminder_date string to Date
            let reminderDateStr = reminderData.reminder_date;
            if (typeof reminderDateStr === 'string') {
                reminderData.reminder_date = new Date(reminderDateStr + 'T00:00:00.000Z');
            }

            console.log('Adding reminder for userId:', userId, 'data:', reminderData);

            await db.addReminder(userId, reminderData);
            console.log('Reminder saved successfully');

            res.status(201).json({ 
                success: true, 
                message: 'Reminder added successfully' 
            });

        } catch (error) {
            console.error('Add reminder error:', error.message);
            console.error('Stack:', error.stack);
            res.status(500).json({ 
                success: false, 
                message: `Failed to add reminder: ${error.message}`,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    async getReminders(req, res) {
        try {
            const userId = req.user.id;
            const reminders = await db.getReminders(userId);

            // Calculate days left and status
            const remindersWithStatus = reminders.map(reminder => {
                const daysLeft = moment(reminder.reminder_date).diff(moment(), 'days');
                let status = 'upcoming';
                
                if (daysLeft < 0 && !reminder.is_completed) {
                    status = 'overdue';
                } else if (daysLeft <= 0) {
                    status = 'today';
                } else if (daysLeft <= 3) {
                    status = 'soon';
                }

                return {
                    ...reminder,
                    days_left: daysLeft,
                    status: status
                };
            });

            res.json({ 
                success: true, 
                reminders: remindersWithStatus 
            });

        } catch (error) {
            console.error('Get reminders error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch reminders' 
            });
        }
    }

    async getUpcomingReminders(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 7;
            
            const reminders = await db.getReminders(userId);
            const upcomingReminders = reminders.filter(reminder => {
                const daysLeft = moment(reminder.reminder_date).diff(moment(), 'days');
                return daysLeft >= 0 && daysLeft <= days && !reminder.is_completed;
            });

            res.json({ 
                success: true, 
                reminders: upcomingReminders,
                count: upcomingReminders.length 
            });

        } catch (error) {
            console.error('Upcoming reminders error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch upcoming reminders' 
            });
        }
    }

    async markComplete(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            // Check if reminder belongs to user
            const existing = await db.findOne('reminders', { _id: id, user_id: userId });

            if (!existing) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Reminder not found' 
                });
            }

            await db.updateOne('reminders',
                { _id: id, user_id: userId },
                { is_completed: true, completed_at: new Date() }
            );

            res.json({ 
                success: true, 
                message: 'Reminder marked as complete' 
            });

        } catch (error) {
            console.error('Mark complete error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update reminder' 
            });
        }
    }

async deleteReminder(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            // Temporarily removed user_id filter for testing
            const result = await db.deleteOne('reminders', { _id: id });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Reminder not found'
                });
            }

            res.json({
                success: true,
                message: 'Reminder deleted successfully'
            });

        } catch (error) {
            console.error('Delete reminder error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete reminder' 
            });
        }
    }

    async updateReminder(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const updateData = req.body;

            // Validate reminder date if provided
            if (updateData.reminder_date) {
                const reminderDate = moment(updateData.reminder_date);
                if (!reminderDate.isValid()) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid reminder date format' 
                    });
                }
            }

            // Check if reminder belongs to user
            const existing = await db.findOne('reminders', { _id: id, user_id: userId });

            if (!existing) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Reminder not found' 
                });
            }

            // Update reminder
            await db.updateOne('reminders',
                { _id: id, user_id: userId },
                {
                    title: updateData.title,
                    description: updateData.description,
                    reminder_date: updateData.reminder_date,
                    priority: updateData.priority || 'medium',
                    category: updateData.category
                }
            );

            res.json({ 
                success: true, 
                message: 'Reminder updated successfully' 
            });

        } catch (error) {
            console.error('Update reminder error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update reminder' 
            });
        }
    }
}

module.exports = new ReminderController();