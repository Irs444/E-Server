const mongoose = require("mongoose");
const multer = require("multer");
const session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
const fs = require("fs");

/* the response object for API
   error : true / false 
   code : contains any error code
   data : the object or array for data
   memberMessage : the message for staffMember, if any.
 */

var response = {
  error: false,
  status: 200,
  data: null,
  memberMessage: "",
  errors: null,
};

var NullResponseValue = function() {
  response = {
    error: false,
    status: 200,
    data: null,
    memberMessage: "",
    errors: null,
  };
  return true;
};

var SendResponse = function(res, status) {
  res.status(status || 200).send(response);
  NullResponseValue();
  return;
};

var methods = {};

/*
 Routings/controller goes here
 */
module.exports.controller = function(router) {
  router.route("/media/:fileName").get((req, res) => {
    res.sendFile(`${mediaPath}/${req.params.fileName}`);
  });

  router.route("/media").post(session.checkToken, methods.uploadMedia);
  router
    .route("/staffMember/profile")
    .post(session.checkToken, methods.uploadMediaProfile);
  router.route("/staffMember/profile/:fileName").get(function(req, res) {
    var path = mediaProfilePath + "/" + req.params.fileName;
    console.log({ path });
    try {
      console.log({ path });
      if (!fs.existsSync(path)) {
        path = mediaProfilePath + "/profile_m.jpeg"; // "/1588829179168.png";
      }
      res.sendFile(path);
    } catch (err) {
      console.error("-----", { err });
    }
  });
};

/*============================
***   upload new media  ***
==============================*/

methods.uploadMedia = (req, res) => {
  var storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, mediaPath);
    },
    filename: function(req, file, cb) {
      let ext = file.originalname.split(".").pop();
      req.fileName = `${Date.now()}.${ext}`;

      // if (ext != "xls" && ext != "xlsx") req.error = "file format not supported";

      cb(null, req.fileName);
    },
  });

  var uploadfile = multer({
    storage: storage,
  }).single("file");

  uploadfile(req, res, (err) => {
    if (err) {
      //send response to client
      response.error = true;
      response.status = 500;
      response.errors = err;
      response.memberMessage = "server error";
      response.data = null;
      return SendResponse(res);
    } else {
      if (req.error) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage = req.error;
        response.data = null;
        return SendResponse(res);
      } else if (!req.fileName) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage = "Media file is missing.";
        response.data = null;
        return SendResponse(res);
      } else {
        //send response to client
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = `/media/${req.fileName}`;
        response.memberMessage = "Your media file uploaded successfully.";
        return SendResponse(res);
      }
    }
  });
};

/*-----  End of uploadMedia  ------*/
/*============================
***   upload new media profile ***
==============================*/
methods.uploadMediaProfile = function(req, res) {
  // req.user._id
  var fileName = "";
  var storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, mediaProfilePath);
    },
    filename: function(req, file, cb) {
      var now = Date.now();
      fileName = now + "." + file.originalname.split(".").pop();
      cb(null, fileName);
    },
  });
  console.log({ fileName });
  var uploadfile = multer({ storage: storage }).single("image");
  uploadfile(req, res, function(err) {
    console.log({ fileName, err });
    if (err) {
      response.error = true;
      response.status = 500;
      response.errors = err;
      response.userMessage = "uploadfile error";
      return SendResponse(res);
    } else {
      //send response to client

      if (fileName == "") {
        response.error = fileName == "";
        response.status = fileName == "" ? 400 : 200;
        response.errors = null;
        response.userMessage =
          fileName == "" ? "media not uploaded" : "media uploaded.";
        response.data = fileName == "" ? null : "/media/profile/" + fileName;
        return SendResponse(res);
      } else {
        StaffMember.findOne({
          _id: req.staffMember._id,
        }).exec((err, staffMember) => {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (!staffMember) {
            //send response to client
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "staffMember not found.";
            return SendResponse(res);
          } else {
            staffMember.profilePicUrl = "/staffMember/profile/" + fileName;
            staffMember.save((err) => {
              if (err) {
                //send response to client
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                //send response to client
                staffMember.deviceInfo = undefined;
                staffMember.password = undefined;
                response.error = false;
                response.status = 200;
                response.errors = null;
                response.data = staffMember;
                response.memberMessage = "Profile image updated successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      }
    }
  });
};
/*-----  End of uploadMediaProfile  ------*/
