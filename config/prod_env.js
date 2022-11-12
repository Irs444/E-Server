/**
 * Expose
 */

module.exports = {
  db: `mongodb://aviral:aviral%402022@arabtechstore.com:27017/tech_store?authSource=admin`,
  logDir: "/var/log/api/", //@todo : check if log directory exits, if not create one.
  sessionSecret: "thisisareallylongandbigsecrettoken",
  encryptionSecret: "securetokentoencrypt",
};
