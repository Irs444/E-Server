const crypto = require('crypto');
const aesWrapper = require('./app/libs/aes-wrapper');

// Best practice: Store key in environment variables, not hardcoded.
// The key must be 32 bytes (256 bits) for aes-256-cbc.
const ALGORITHM = 'aes-256-cbc'; 
const ENCRYPTION_KEY = aesWrapper.generateKey(); 

function encrypt(text) {
  const iv = crypto.randomBytes(16); // Generate a random IV for each encryption.
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Combine IV and encrypted data for storage/transmission, separated by a colon.
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  // Split the IV and the actual encrypted data
  const [ivHex, encryptedDataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(encryptedDataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- Usage Example ---
const originalMessage = 'This is a secret message.';
const encryptedMessage = encrypt(originalMessage);
console.log('Encrypted message:', encryptedMessage);
const decryptedMessage = decrypt(encryptedMessage);
console.log('Decrypted message:', decryptedMessage);
// Output will show the original message after decryption.
