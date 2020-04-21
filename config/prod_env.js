/**
 * Expose
 */

module.exports = {
  // db: 'mongodb://myUserAdmin:abc123@localhost:27017/licApp?authSource=admin',
  db: process.env.MONGO_URL || 'mongodb://localhost:27017/licApp',
  logDir: '/var/log/api/', //@todo : check if log directory exits, if not create one.
  sessionSecret: "thisisareallylongandbigsecrettoken",
  encryptionSecret: 'securetokentoencrypt',
 };