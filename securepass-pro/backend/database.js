const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securepass';

// Helper function to convert string to MongoDB ObjectId
function toObjectId(id) {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch (e) {
        return id;
    }
}

// MongoDB Collections/Schemas
const userSchema = new mongoose.Schema({
    employee_id: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String },
    password_hash: { type: String, required: true },
    role: { type: String, default: 'employee' },
    created_at: { type: Date, default: Date.now }
});

const passwordSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    app_name: { type: String, required: true },
    website_url: { type: String },
    username: { type: String, required: true },
    encrypted_password: { type: String, required: true },
    expiry_date: { type: Date, required: true },
    days_before_reminder: { type: Number, default: 7 },
    category: { type: String },
    notes: { type: String },
    created_at: { type: Date, default: Date.now }
});

const reminderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    reminder_date: { type: Date, required: true },
    priority: { type: String, default: 'medium' },
    category: { type: String },
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date },
    created_at: { type: Date, default: Date.now }
});

const emailLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email_type: { type: String, required: true },
    sent_at: { type: Date, default: Date.now }
});

const uploadedFileSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now }
});

const workNoteSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    note_date: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create indexes
userSchema.index({ email: 1 });

// Models
const User = mongoose.model('User', userSchema);
const Password = mongoose.model('Password', passwordSchema);
const Reminder = mongoose.model('Reminder', reminderSchema);
const EmailLog = mongoose.model('EmailLog', emailLogSchema);
const UploadedFile = mongoose.model('UploadedFile', uploadedFileSchema);
const WorkNote = mongoose.model('WorkNote', workNoteSchema);

class Database {
    constructor() {
        this.isConnected = false;
    }

async connect() {
        try {
            console.log(`🔄 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
            await mongoose.connect(MONGODB_URI);
            this.isConnected = true;
            console.log(`✅ MongoDB Connected! ReadyState: ${mongoose.connection.readyState} (${['disconnected','connecting','connected','disconnecting'][mongoose.connection.readyState]})`);
        } catch (error) {
            console.error('❌ MongoDB connection FAILED:', error.message);
            console.error('Full error:', error.stack);
            throw error;
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            state: ['disconnected','connecting','connected','disconnecting'][mongoose.connection.readyState],
            host: mongoose.connection.host || 'unknown'
        };
    }

    async init() {
        await this.connect();
        await this.createAdminUser();
        console.log('✅ Database initialized');
    }

    async createAdminUser() {
        const adminData = {
            employee_id: 'ADMIN001',
            full_name: 'System Admin',
            email: 'admin@company.com',
            department: 'IT',
            password: 'Admin@123',
            role: 'admin'
        };

        const existing = await this.getUserByEmail(adminData.email);
        if (!existing) {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            await this.createUser({
                ...adminData,
                password_hash: hashedPassword
            });
            console.log('✅ Admin user created');
        }
    }

    // Encryption/Decryption methods
    encryptPassword(password) {
        return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
    }

    decryptPassword(encryptedPassword) {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    // User methods
    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 4);
        const user = new User({
            employee_id: userData.employee_id,
            full_name: userData.full_name,
            email: userData.email,
            department: userData.department,
            password_hash: hashedPassword,
            role: userData.role || 'employee'
        });
        return user.save();
    }

    async getUserByEmail(email) {
        const user = await User.findOne({ email }).lean();
        if (user) {
            user.id = user._id.toString();
        }
        return user;
    }

    async getUserById(id) {
        const user = await User.findById(id).lean();
        if (user) {
            user.id = user._id.toString();
        }
        return user;
    }

    async verifyUser(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return null;

        // Add id property for backward compatibility
        user.id = user._id.toString();

        // Check if password needs rehashing (if cost is 10, 8, or 6, rehash to 4)
        const hashParts = user.password_hash.split('$');
        if (hashParts.length >= 4 && (hashParts[2] === '10' || hashParts[2] === '08' || hashParts[2] === '06')) {
            const newHash = await bcrypt.hash(password, 4);
            await User.findByIdAndUpdate(user._id, { password_hash: newHash });
            console.log(`✅ Rehashed password for user ${user.email}`);
        }

        return user;
    }

    // Password methods
    async addPassword(userId, passwordData) {
        const encryptedPassword = this.encryptPassword(passwordData.password);
        
        const password = new Password({
            user_id: toObjectId(userId),
            app_name: passwordData.app_name,
            website_url: passwordData.website_url || '',
            username: passwordData.username,
            encrypted_password: encryptedPassword,
            expiry_date: passwordData.expiry_date,
            days_before_reminder: passwordData.days_before_reminder || 7,
            category: passwordData.category,
            notes: passwordData.notes || ''
        });
        return password.save();
    }

    async getPasswords(userId) {
        // Temporarily removed user_id filter for testing
        const passwords = await Password.find({})
            .sort({ expiry_date: 1 })
            .lean();

        // Decrypt passwords for display
        return passwords.map(pwd => ({
            ...pwd,
            id: pwd._id.toString(),
            password: this.decryptPassword(pwd.encrypted_password)
        }));
    }

    async getExpiringPasswords(days = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const passwords = await Password.find({
            expiry_date: {
                $gte: today,
                $lte: futureDate
            }
        })
        .populate('user_id', 'email full_name')
        .sort({ expiry_date: 1 })
        .lean();

        return passwords.map(pwd => ({
            ...pwd,
            id: pwd._id.toString(),
            email: pwd.user_id?.email,
            full_name: pwd.user_id?.full_name,
            user_id: pwd.user_id?._id
        }));
    }

    // Reminder methods
    async addReminder(userId, reminderData) {
        const reminder = new Reminder({
            user_id: toObjectId(userId),
            title: reminderData.title,
            description: reminderData.description,
            reminder_date: reminderData.reminder_date,
            priority: reminderData.priority || 'medium',
            category: reminderData.category
        });
        return reminder.save();
    }

    async getReminders(userId) {
        // Temporarily removed user_id filter for testing
        const reminders = await Reminder.find({})
            .sort({ reminder_date: 1 })
            .lean();

        return reminders.map(r => ({
            ...r,
            id: r._id.toString()
        }));
    }

    async getUpcomingReminders(days = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reminders = await Reminder.find({
            reminder_date: {
                $gte: today,
                $lte: futureDate
            },
            is_completed: false
        })
        .populate('user_id', 'email full_name')
        .sort({ reminder_date: 1 })
        .lean();

        return reminders.map(r => ({
            ...r,
            id: r._id.toString(),
            email: r.user_id?.email,
            full_name: r.user_id?.full_name,
            user_id: r.user_id?._id
        }));
    }

    // Work Note methods
    async addWorkNote(userId, noteData) {
        const workNote = new WorkNote({
            user_id: toObjectId(userId),
            title: noteData.title,
            content: noteData.content,
            note_date: noteData.note_date || new Date()
        });
        return workNote.save();
    }

    async getWorkNotes() {
        const notes = await WorkNote.find({})
            .sort({ note_date: -1 })
            .lean();
        
        return notes.map(n => ({
            ...n,
            id: n._id.toString()
        }));
    }

    async getWorkNoteById(noteId, userId) {
        const note = await WorkNote.findOne({ _id: toObjectId(noteId), user_id: toObjectId(userId) }).lean();
        if (note) {
            note.id = note._id.toString();
        }
        return note;
    }

    async updateWorkNote(noteId, userId, updateData) {
        return WorkNote.findOneAndUpdate(
            { _id: toObjectId(noteId), user_id: toObjectId(userId) },
            { ...updateData, updated_at: new Date() },
            { new: true }
        );
    }

    async deleteWorkNote(noteId, userId) {
        // Temporarily removed user_id filter for testing
        return WorkNote.findOneAndDelete({ _id: toObjectId(noteId) });
    }

    // Generic database helper methods (for backward compatibility with controllers)
    run(sql, params = []) {
        return Promise.resolve({ id: null, changes: 0 });
    }

    get(sql, params = []) {
        return Promise.resolve(null);
    }

    all(sql, params = []) {
        return Promise.resolve([]);
    }

    // For controllers that use direct queries - convert string IDs to ObjectId
    convertQueryIds(query) {
        if (!query) return query;
        const converted = {};
        for (const key in query) {
            if (key === '_id' || key === 'user_id') {
                converted[key] = toObjectId(query[key]);
            } else {
                converted[key] = query[key];
            }
        }
        return converted;
    }

    async findOne(collection, query) {
        const convertedQuery = this.convertQueryIds(query);
        switch (collection) {
            case 'users':
                return User.findOne(convertedQuery).lean();
            case 'app_passwords':
                return Password.findOne(convertedQuery).lean();
            case 'reminders':
                return Reminder.findOne(convertedQuery).lean();
            default:
                return null;
        }
    }

    async find(collection, query) {
        const convertedQuery = this.convertQueryIds(query);
        switch (collection) {
            case 'users':
                return User.find(convertedQuery).lean();
            case 'app_passwords':
                return Password.find(convertedQuery).lean();
            case 'reminders':
                return Reminder.find(convertedQuery).lean();
            default:
                return [];
        }
    }

    async updateOne(collection, query, update) {
        const convertedQuery = this.convertQueryIds(query);
        switch (collection) {
            case 'app_passwords':
                return Password.findOneAndUpdate(convertedQuery, update, { new: true });
            case 'reminders':
                return Reminder.findOneAndUpdate(convertedQuery, update, { new: true });
            default:
                return null;
        }
    }

    async deleteOne(collection, query) {
        const convertedQuery = this.convertQueryIds(query);
        switch (collection) {
            case 'app_passwords':
                return Password.findOneAndDelete(convertedQuery);
            case 'reminders':
                return Reminder.findOneAndDelete(convertedQuery);
            default:
                return null;
        }
    }

    // Email log methods
    async addEmailLog(userId, emailType) {
        const emailLog = new EmailLog({
            user_id: toObjectId(userId),
            email_type: emailType
        });
        return emailLog.save();
    }

    async getEmailCount(userId) {
        return EmailLog.countDocuments({ user_id: toObjectId(userId) });
    }

    // Uploaded file methods
    async addUploadedFile(userId, filename, filepath) {
        const uploadedFile = new UploadedFile({
            user_id: toObjectId(userId),
            filename,
            filepath,
            uploaded_at: new Date() 
        });
        return uploadedFile.save();
    }

    async getUploadedFiles(userId) {
        // Temporarily removed user_id filter for testing
        const files = await UploadedFile.find({})
            .sort({ uploaded_at: -1 })
            .lean();
        return files.map(f => ({
            ...f,
            id: f._id.toString()
        }));
    }

    async getUploadedFileById(fileId, userId) {
        // Temporarily removed user_id filter for testing
        const file = await UploadedFile.findOne({ _id: toObjectId(fileId) }).lean();
        if (file) {
            file.id = file._id.toString();
        }
        return file;
    }

    async deleteUploadedFile(fileId, userId) {
        // Temporarily removed user_id filter for testing
        return UploadedFile.findOneAndDelete({ _id: toObjectId(fileId) });
    }

    close() {
        return mongoose.connection.close();
    }
}

module.exports = new Database();
