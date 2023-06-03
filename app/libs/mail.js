var nodemailer = require("nodemailer");
var mail = {};

mail.sendMail = function (to, subject, body, sender) {
  console.log({ to, subject });
  // button is not displayed
  /**
   * salescoordinator@arabtechstore.com
password- zG&LYE4\dp?LA]rJ
http://mail.cloudwebmail.net/

   */
  var connection = {
    host: "mail.cloudwebmail.net", //"smtp.gmail.com", // ,
    port: 465,
    secure: true,
    auth: {
      user: "salescoordinator@arabtechstore.com",
      pass: "Aa!7607862383", //"otp@2020"
      // pass: "zG&LYE4dp?LA]rJ",
      // pass: "zG%26LYE4dp%3FLA%5DrJ",
    },
    logger: true,
    requireTLS: true, //Force TLS
    tls: {
      rejectUnauthorized: false,
    },
  };

  // var connection = {
  //   host: process.env.SMTP_HOST || "mail.gaviral.in", //"smtp.gmail.com", // ,
  //   port: process.env.SMTP_PORT || 26, //465,
  //   auth: {
  //     user: process.env.SMTP_USER || "otp@gaviral.in",
  //     pass: process.env.SMTP_PASSWORD || "Aa!7607862383",
  //   },
  //   logger: true,
  //   requireTLS: true, //Force TLS
  //   tls: {
  //     rejectUnauthorized: false,
  //   },
  // };
  console.log({ connection });
  // Create reusable transporter object using the default SMTP transport
  var transporter = nodemailer.createTransport(connection);

  // setup e-mail data
  var mailOptions = {
    //Specify email data
    from: "Arab Tech Store <salescoordinator@arabtechstore.com>", //<amitchauhan7890@gmail.com>",
    //The email to contact
    to: to,
    //Subject and text data
    subject: subject,
    html: body,
  };

  // send mail
  transporter.sendMail(mailOptions, function (error, response) {
    console.log(error, response);
  });
};

module.exports = mail;
