var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var PolicyPlan = new Schema({
  policyPlanNumber: {
    type: String,
    default: ""
  },
  policyPlanName: {
    type: String,
    default: ""
    // index: {
    //   unique: true
    // }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
var PolicyPlanInfo = new Schema({
  policyPlanId: {
    type: ObjectId,
    default: null,
    ref: "policyPlan"
  },

  // dealerId: {
  //   type: ObjectId,
  //   default: null,
  //   ref: "dealer"
  // },
  createdAt: {
    type: Date,
    default: Date.now
  },
  yearOfReturn: {
    type: String
  },
  planInfo: [
    {
      durationYear: String,
      revivalAmount: Number
    }
  ]
});
// var planInfoSchema = new Schema({
//   durationYear: String,
//   revivalAmount: Number,
// });
mongoose.model("policyPlanInfo", PolicyPlanInfo);
mongoose.model("policyPlan", PolicyPlan);
