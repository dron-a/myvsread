import * as crypto from 'crypto';

function getKey(seed: string): Buffer {
    return crypto.createHash('sha256').update(seed).digest();
}

export function encrypt(text: string, seed: string): string {
    const iv = crypto.randomBytes(16);
    const key = getKey(seed);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return `MYVSREAD_ENC\niv:${iv.toString('base64')}\ndata:${encrypted}`;
}

export function decrypt(content: string, seed: string): string {
    const lines = content.split('\n');

    if (lines[0] !== 'MYVSREAD_ENC') {
        throw new Error('Not a valid encrypted file');
    }

    const iv = Buffer.from(lines[1].split(':')[1], 'base64');
    const data = lines[2].split(':')[1];

    const key = getKey(seed);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}