const db = require('../database');
const moment = require('moment');

class PasswordController {
    async addPassword(req, res) {
        try {
            const userId = req.user.id;
            const passwordData = req.body;

            // Fix expiry_date string to Date
            let expiryDateStr = passwordData.expiry_date;
            if (typeof expiryDateStr === 'string') {
                passwordData.expiry_date = new Date(expiryDateStr + 'T00:00:00.000Z');
            }

            console.log('Adding password for userId:', userId, 'data:', passwordData);

            await db.addPassword(userId, passwordData);
            console.log('Password saved successfully');

            res.status(201).json({ 
                success: true, 
                message: 'Password added successfully' 
            });

        } catch (error) {
            console.error('Add password error:', error.message);
            console.error('Stack:', error.stack);
            res.status(500).json({ 
                success: false, 
                message: `Failed to add password: ${error.message}`,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    async getPasswords(req, res) {
        try {
            const userId = req.user.id;
            const passwords = await db.getPasswords(userId);
            console.log('Passwords from DB:', passwords);

            // Calculate days left for each password
            const passwordsWithStatus = passwords.map(pwd => {
                const daysLeft = moment(pwd.expiry_date).diff(moment(), 'days');
                let status = 'safe';

                if (daysLeft <= 0) {
                    status = 'expired';
                } else if (daysLeft <= 7) {
                    status = 'warning';
                } else if (daysLeft <= 30) {
                    status = 'info';
                }

                return {
                    ...pwd,
                    days_left: daysLeft,
                    status: status
                };
            });

            console.log('Passwords with status:', passwordsWithStatus);
            res.json({
                success: true,
                passwords: passwordsWithStatus
            });

        } catch (error) {
            console.error('Get passwords error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch passwords'
            });
        }
    }

    async getExpiringPasswords(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 7;
            
            const passwords = await db.getPasswords(userId);
            const expiringPasswords = passwords.filter(pwd => {
                const daysLeft = moment(pwd.expiry_date).diff(moment(), 'days');
                return daysLeft >= 0 && daysLeft <= days;
            });

            res.json({ 
                success: true, 
                passwords: expiringPasswords,
                count: expiringPasswords.length 
            });

        } catch (error) {
            console.error('Expiring passwords error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch expiring passwords' 
            });
        }
    }

    async updatePassword(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const updateData = req.body;

            // Check if password belongs to user
            const existing = await db.findOne('app_passwords', { _id: id, user_id: userId });

            if (!existing) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Password not found' 
                });
            }

            // Update password
            const encryptedPassword = db.encryptPassword(updateData.password);
            
            await db.updateOne('app_passwords',
                { _id: id, user_id: userId },
                {
                    app_name: updateData.app_name,
                    website_url: updateData.website_url,
                    username: updateData.username,
                    encrypted_password: encryptedPassword,
                    expiry_date: updateData.expiry_date,
                    days_before_reminder: updateData.days_before_reminder || 7,
                    category: updateData.category,
                    notes: updateData.notes
                }
            );

            res.json({ 
                success: true, 
                message: 'Password updated successfully' 
            });

        } catch (error) {
            console.error('Update password error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update password' 
            });
        }
    }

    async deletePassword(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            // Temporarily removed user_id filter for testing
            const result = await db.deleteOne('app_passwords', { _id: id });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Password not found'
                });
            }

            res.json({
                success: true,
                message: 'Password deleted successfully'
            });

        } catch (error) {
            console.error('Delete password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete password'
            });
        }
    }
}

module.exports = new PasswordController();

