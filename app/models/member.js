var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var member = new Schema({
  name: {
    type: String,
    default: ""
  },
  deviceId: {
    type: String,
  },
  imeiNumber: {
    type: String,
    default: ""
    // index: {
    //   unique: true
    // }
  }, 
  avatar: {
    type: String,
    default: "/api/media/default-member.png"
  }, 
  email: {
    type: String,
    default: ""
    // index: {
    //   unique: true
    // }
  },
  contactNumber: {
    type: String,
    // default: ""
    index: {
      unique: true
    }
  }, 
  password: {
    type: String,
    default: ""
  },
  dealerId: {
    type: ObjectId,
    default: null,
    ref: "dealer"
  },
  memberType: {
    type: Number,
    default: 1, //super admin, dealer, agent
    enum: [1, 2,3]
  },
  isSubscribe: {
    type: Number,
    default: 0, //unsubscribe
    enum: [0, 1]
  },
  active: {
    type: Number,
    default: 1, //active
    enum: [0, 1]
  },
  appVersion: {
    type: String,
    default: ""
  }, 
  createdAt: {
    type: Date,
    default: Date.now
  } ,
  expiredAt: {
    type: Date,
    default: ""
  },
  subscribedAt: {
    type: Date,
    default: ""
  }
} );

var session = new Schema({
  memberId: {
    type: ObjectId,
    default: null,
    ref: "member"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  authToken: {
    type: String
  }
});

mongoose.model("member", member);
mongoose.model("session", session);
