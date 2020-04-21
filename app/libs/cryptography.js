var crypto = require("crypto"),
  algorithm = "aes-256-ctr",
  password = process.env.ENCRYPTION_PASSWORD,
  cryptography = {};

cryptography.encrypt = function (text) {
  var cipher = crypto.createCipher(algorithm, password);
  var crypted = cipher.update(text, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
};

cryptography.decrypt = function (text) {
  var decipher = crypto.createDecipher(algorithm, password);
  var dec = decipher.update(text, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
};

var hw = "0585df9970232b24"; // cryptography.encrypt("aditya@ohphish.com");
// console.log(hw);
// outputs hello world
// console.log(cryptography.decrypt(hw));
// console.log(cryptography.encrypt("SdPExN3H"));

module.exports = { ...cryptography };
