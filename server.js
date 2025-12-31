const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');

const app = express();
const PORT = 7655;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/view/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

const storage = new Map();

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 100 * 1024 * 1024 }
});

function encrypt(data, password = null) {
    const key = password 
        ? crypto.scryptSync(password, 'salt', 32)
        : crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        key: password ? null : key.toString('hex')
    };
}

function decrypt(encrypted, iv, authTag, key, password = null) {
    const keyBuffer = password 
        ? crypto.scryptSync(password, 'salt', 32)
        : Buffer.from(key, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

function cleanupExpired() {
    const now = Date.now();
    for (const [id, data] of storage.entries()) {
        if (data.expiresAt && data.expiresAt < now) {
            if (data.filePath && fs.existsSync(data.filePath)) {
                fs.unlinkSync(data.filePath);
            }
            storage.delete(id);
            console.log(`Cleaned up expired item: ${id}`);
        }
    }
}

schedule.scheduleJob('* * * * *', cleanupExpired);

app.post('/api/upload/text', (req, res) => {
    try {
        const { content, expiry, burnAfterRead, password, isMarkdown } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        const id = uuidv4();
        const encryptionData = encrypt(content, password);
        
        const expiryMinutes = parseInt(expiry) || 0;
        const expiresAt = expiryMinutes > 0 ? Date.now() + (expiryMinutes * 60 * 1000) : null;
        
        storage.set(id, {
            type: 'text',
            encrypted: encryptionData.encrypted,
            iv: encryptionData.iv,
            authTag: encryptionData.authTag,
            key: encryptionData.key,
            hasPassword: !!password,
            burnAfterRead: !!burnAfterRead,
            isMarkdown: !!isMarkdown,
            expiresAt,
            createdAt: Date.now()
        });
        
        const url = `${req.protocol}://${req.get('host')}/view/${id}`;
        res.json({ success: true, id, url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.post('/api/upload/file', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }
        
        const { expiry, burnAfterRead, password } = req.body;
        const id = uuidv4();
        
        const fileContent = fs.readFileSync(req.file.path);
        const encryptionData = encrypt(fileContent.toString('base64'), password);
        
        const encryptedPath = path.join('uploads', `${id}.enc`);
        fs.writeFileSync(encryptedPath, JSON.stringify({
            encrypted: encryptionData.encrypted,
            iv: encryptionData.iv,
            authTag: encryptionData.authTag
        }));
        
        fs.unlinkSync(req.file.path);
        
        const expiryMinutes = parseInt(expiry) || 0;
        const expiresAt = expiryMinutes > 0 ? Date.now() + (expiryMinutes * 60 * 1000) : null;
        
        storage.set(id, {
            type: 'file',
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            filePath: encryptedPath,
            key: encryptionData.key,
            hasPassword: !!password,
            burnAfterRead: !!burnAfterRead,
            expiresAt,
            createdAt: Date.now()
        });
        
        const url = `${req.protocol}://${req.get('host')}/view/${id}`;
        res.json({ success: true, id, url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.get('/api/view/:id', (req, res) => {
    const { id } = req.params;
    const data = storage.get(id);
    
    if (!data) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    if (data.expiresAt && data.expiresAt < Date.now()) {
        if (data.filePath && fs.existsSync(data.filePath)) {
            fs.unlinkSync(data.filePath);
        }
        storage.delete(id);
        return res.status(404).json({ error: 'Content expired' });
    }
    
    res.json({
        type: data.type,
        hasPassword: data.hasPassword,
        burnAfterRead: data.burnAfterRead,
        isMarkdown: data.isMarkdown,
        filename: data.filename,
        size: data.size
    });
});

app.post('/api/retrieve/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        const data = storage.get(id);
        
        if (!data) {
            return res.status(404).json({ error: 'Not found' });
        }
        
        if (data.expiresAt && data.expiresAt < Date.now()) {
            if (data.filePath && fs.existsSync(data.filePath)) {
                fs.unlinkSync(data.filePath);
            }
            storage.delete(id);
            return res.status(404).json({ error: 'Content expired' });
        }
        
        if (data.hasPassword && !password) {
            return res.status(401).json({ error: 'Password required' });
        }
        
        try {
            if (data.type === 'text') {
                const decrypted = decrypt(
                    data.encrypted,
                    data.iv,
                    data.authTag,
                    data.key,
                    password
                );
                
                if (data.burnAfterRead) {
                    storage.delete(id);
                }
                
                res.json({
                    success: true,
                    content: decrypted,
                    isMarkdown: data.isMarkdown
                });
            } else {
                // File
                const encryptedData = JSON.parse(fs.readFileSync(data.filePath, 'utf8'));
                const decrypted = decrypt(
                    encryptedData.encrypted,
                    encryptedData.iv,
                    encryptedData.authTag,
                    data.key,
                    password
                );
                
                if (data.burnAfterRead) {
                    fs.unlinkSync(data.filePath);
                    storage.delete(id);
                }
                
                const fileBuffer = Buffer.from(decrypted, 'base64');
                res.json({
                    success: true,
                    content: fileBuffer.toString('base64'),
                    filename: data.filename,
                    mimetype: data.mimetype
                });
            }
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Invalid password or corrupted data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Retrieval failed' });
    }
});

app.listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`);
});
