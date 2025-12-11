// var crypto = require("crypto"),
//   algorithm = "aes-256-ctr",
//   password = process.env.ENCRYPTION_PASSWORD,
//   cryptography = {};

// cryptography.encrypt = function (text) {
//   var cipher = crypto.createCipher(algorithm, password);
//   var crypted = cipher.update(text, "utf8", "hex");
//   crypted += cipher.final("hex");
//   return crypted;
// };

// cryptography.decrypt = function (text) {
//   var decipher = crypto.createDecipher(algorithm, password);
//   var dec = decipher.update(text, "hex", "utf8");
//   dec += decipher.final("utf8");
//   return dec;
// };

// var hw = "0585df9970232b24";
// // console.log(hw);
// // outputs hello world
// // console.log(cryptography.decrypt(hw));
// // console.log(cryptography.encrypt("SdPExN3H"));

// module.exports = { ...cryptography };

const crypto = require("crypto");
const aesWrapper = require("./aes-wrapper");

const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = aesWrapper.generateKey();
const cryptography = {};

cryptography.encrypt = function (text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

cryptography.decrypt = function (encryptedText) {

  const [ivHex, encryptedDataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(encryptedDataHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { ...cryptography }