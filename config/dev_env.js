/**
 * Expose
 */

module.exports = {
  // db: process.env.MONGO_URL || 'mongodb://myUserAdmin:abc123@localhost:27017/licApp?authSource=admin',
  db: process.env.MONGO_URL || 'mongodb://localhost:27017/licApp',
  logDir: './logs/', //@todo : check if log directory exits, if not create one.
  sessionSecret: "thisisareallylongandbigsecrettoken",
  encryptionSecret: 'securetokentoencrypt',
 };