import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production-32bytes';

// Garantir que a chave tenha 32 bytes
const KEY = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));

/**
 * Criptografar texto
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Retornar IV + dados criptografados
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Descriptografar texto
 */
export function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return '';
  }
}
