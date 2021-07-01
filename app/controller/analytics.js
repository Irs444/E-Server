var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
var Dealer = mongoose.model("dealer");
var async = require("async");
const moment = require("moment");

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
  router
    .route("/analytics/graph")
    .get(session.checkToken, methods.dashboardAnalytics);
  // .get(session.checkToken, methods.dashboardAnalytics);
};
function getDates(startDate, stopDate) {
  var dateArray = [];
  var currentDate = moment(startDate);
  var stopDate = moment(stopDate);
  while (currentDate <= stopDate) {
    dateArray.push(moment(currentDate).format("YYYY-MM-DD"));
    currentDate = moment(currentDate).add(1, "days");
  }
  return dateArray;
}

function getGraphData(dummyArray, subscribedMembers, connectedMembers) {
  var data = [];
  if (subscribedMembers.length > 0 && connectedMembers.length > 0) {
    for (i = 0; i < connectedMembers.length; i++) {
      data.push({
        label: connectedMembers[i]["date"],
        totalMember: connectedMembers[i]["totalCount"],
        totalSubscribe: subscribedMembers[i]["totalSubscribe"],
      });
    }
  } else if (connectedMembers.length > 0) {
    for (i = 0; i < connectedMembers.length; i++) {
      data.push({
        label: connectedMembers[i]["date"],
        totalMember: connectedMembers[i]["totalCount"],
        totalSubscribe: 0,
      });
    }
  } else {
    for (i = 0; i < dummyArray.length; i++) {
      data.push({
        label: dummyArray[i],
        totalMember: 0,
        totalSubscribe: 0,
      });
    }
  }
  return data;
}

/*===============================
***   dashboard analytics  ***
=================================*/
methods.dashboardAnalytics = (req, res) => {
  var endDate = new Date(
    moment(req.query.endDate)
      .utc("0530")
      .endOf("day")
  );
  var startDate = new Date(
    moment(endDate)
      .utc("0530")
      .subtract(1, "month")
      // .subtract(15, "day")
      .startOf("day")
  );
  if (req.query.startDate && req.query.endDate) {
    startDate = new Date(
      moment(req.query.startDate)
        .utc("0530")
        .startOf("day")
    );
  }

  const dummyArray = getDates(startDate, endDate);
  // startDate = new Date("2013-04-08T00:00:00Z");
  // endDate = new Date("2013-04-15T00:00:00Z"); createdAt
  // console.log({ startDate, endDate });
  // console.log(req.staffMember);
  var query = {};
  if (req.staffMember.accessLevel != 1) {
    query = { dealerId: req.staffMember.dealerId };
  }

  async.parallel(
    {
      connectedMembers: function(callback) {
        StaffMember.aggregate(
          [
            {
              $match: {
                $and: [{ createdAt: { $gte: startDate, $lt: endDate } }, query],
              },
            },
            {
              $project: {
                day: { $substr: ["$createdAt", 0, 10] },
              },
            },
            {
              $group: {
                _id: "$day",
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                date: "$_id",
                totalCount: "$count",
              },
            },
            {
              $group: {
                _id: null,
                stats: { $push: "$$ROOT" },
              },
            },
            {
              $project: {
                stats: {
                  $map: {
                    input: dummyArray,
                    as: "date",
                    in: {
                      $let: {
                        vars: {
                          dateIndex: {
                            $indexOfArray: ["$stats._id", "$$date"],
                          },
                        },
                        in: {
                          $cond: {
                            if: { $ne: ["$$dateIndex", -1] },
                            then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                            else: {
                              _id: "$$date",
                              date: "$$date",
                              totalCount: 0,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              $unwind: "$stats",
            },
            {
              $replaceRoot: {
                newRoot: "$stats",
              },
            },
          ],
          callback
        );
      },
      subscribedMembers: function(callback) {
        StaffMember.aggregate(
          [
            {
              $match: {
                $and: [
                  { isSubscribe: { $eq: 1 } },
                  { createdAt: { $gte: startDate, $lt: endDate } },
                  query,
                ],
              },
            },
            {
              $project: {
                day: { $substr: ["$subscribedAt", 0, 10] },
              },
            },
            {
              $group: {
                _id: "$day",
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                date: "$_id",
                totalSubscribe: "$count",
              },
            },
            {
              $group: {
                _id: null,
                stats: { $push: "$$ROOT" },
              },
            },
            {
              $project: {
                stats: {
                  $map: {
                    input: dummyArray,
                    as: "date",
                    in: {
                      $let: {
                        vars: {
                          dateIndex: {
                            $indexOfArray: ["$stats._id", "$$date"],
                          },
                        },
                        in: {
                          $cond: {
                            if: { $ne: ["$$dateIndex", -1] },
                            then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                            else: {
                              _id: "$$date",
                              date: "$$date",
                              totalSubscribe: 0,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              $unwind: "$stats",
            },
            {
              $replaceRoot: {
                newRoot: "$stats",
              },
            },
            {
              $project: {
                totalSubscribe: "$totalSubscribe",
              },
            },
          ],
          callback
        );
      },
      totalStack: function(callback) {
        StaffMember.aggregate(
          [
            { $match: { $and: [{ accessLevel: { $eq: 3 } }, query] } },
            {
              $project: {
                // day: { $substr: ["$createdAt", 0, 10] },
                isSubscribe: "$isSubscribe",
                // isSubscribe: "$isSubscribe",
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                // time: { $avg: "$createdAt" },
                isSubscribe: { $push: "$isSubscribe" },
                subscribe: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$isSubscribe", 1],
                      },
                      1,
                      0,
                    ],
                  },
                },
                unSubscribe: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$isSubscribe", 0],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                // date: "$_id",
                totalCount: "$count",
                // isSubscribe: "$isSubscribe",
                totalSubscribe: "$subscribe",
                totalUnsubscribe: "$unSubscribe",
              },
            },
          ],
          callback
        );
      },
      totalMember: function(callback) {
        StaffMember.count({ accessLevel: { $eq: 3 } }, callback);
      },
      totalMemberSubscribed: function(callback) {
        StaffMember.count(
          { $and: [{ accessLevel: { $eq: 3 } }, { isSubscribe: { $eq: 1 } }] },
          callback
        );
      },
      memberCollection: function(callback) {
        Dealer.aggregate(
          [
            // { $match: { accessLevel: { $eq: 3 } } },
            {
              $lookup: {
                from: "members",
                localField: "_id",
                foreignField: "dealerId",
                as: "staffMember",
              },
            },
            { $unwind: "$staffMember" },
            // { $match: { "$staffMember.accessLevel": { $eq: 2 } } },
            {
              $group: {
                _id: "$dealerCode",
                name: { $first: "$name" },
                count: { $sum: 1 },
                subscribe: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$staffMember.isSubscribe", 1],
                      },
                      1,
                      0,
                    ],
                  },
                },
                unSubscribe: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$staffMember.isSubscribe", 0],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                dealerCode: "$_id",
                totalCount: "$count",
                totalSubscribe: "$subscribe",
                totalUnsubscribe: "$unSubscribe",
                name: "$name",
              },
            },
            { $sort: { totalCount: -1 } },
          ],
          callback
        );
      },
      collectionDealer: function(callback) {
        Dealer.aggregate(
          [
            // { $match: { accessLevel: { $eq: 3 } } },
            {
              $lookup: {
                from: "members",
                localField: "_id",
                foreignField: "dealerId",
                as: "staffMember",
              },
            },
            { $unwind: "$staffMember" },
            // { $match: { "$staffMember.accessLevel": { $eq: 2 } } },
            {
              $group: {
                _id: "$dealerCode",
                name: { $first: "$name" },
                count: { $sum: 1 },
                subscribe: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$staffMember.isSubscribe", 1],
                      },
                      1,
                      0,
                    ],
                  },
                },
                unSubscribe: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$staffMember.isSubscribe", 0],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                dealerCode: "$_id",
                totalCount: "$count",
                totalSubscribe: "$subscribe",
                totalUnsubscribe: "$unSubscribe",
                name: "$name",
              },
            },
            { $sort: { totalSubscribe: -1 } },
          ],
          callback
        );
      },
    },
    function done(err, results) {
      // console.log({ err, results });
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else {
        //send response to user
        var connectedMembers = results.connectedMembers;
        var subscribedMembers = results.subscribedMembers;
        // console.log({ subscribedMembers, connectedMembers });
        results.graphData = getGraphData(
          dummyArray,
          subscribedMembers,
          connectedMembers
        );
        results.connectedMembers = undefined;
        results.subscribedMembers = undefined;
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = results;
        response.memberMessage = "Dashboard analytics fetched successfully.";
        return SendResponse(res);
      }
    }
  );
};

/**
 *  StaffMember.aggregate(
        [
          // { $match: { saleDate: { $gte: startDate, $lt: endDate } } },
          {
            $project: {
              day: { $substr: ["$createdAt", 0, 10] },
              isSubscribe: "$isSubscribe"
            }
          },
          {
            $group: {
              _id: "$day",
              count: { $sum: 1 },
              // time: { $avg: "$createdAt" },
              isSubscribe: { $push: "$isSubscribe" },
              subscribe: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$isSubscribe", 1]
                    },
                    1,
                    0
                  ]
                }
              },
              unSubscribe: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$isSubscribe", 0]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              date: "$_id",
              totalCount: "$count",
              // isSubscribe: "$isSubscribe",
              totalSubscribe: "$subscribe",
              totalUnsubscribe: "$unSubscribe"
            }
          },
          {
            $group: {
              _id: null,
              stats: { $push: "$$ROOT" }
            }
          },
          {
            $project: {
              stats: {
                $map: {
                  input: dummyArray,
                  as: "date",
                  in: {
                    $let: {
                      vars: {
                        dateIndex: { $indexOfArray: ["$stats._id", "$$date"] }
                      },
                      in: {
                        $cond: {
                          if: { $ne: ["$$dateIndex", -1] },
                          then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                          else: { _id: "$$date", date: "$$date", totalCount: 0, totalUnsubscribe: 0, totalSubscribe: 0 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            $unwind: "$stats"
          },
          {
            $replaceRoot: {
              newRoot: "$stats"
            }
          }
        ],
        callback
      );
 * 
 */

methods.dashboardAnalytics2 = (req, res) => {
  var endDate = new Date(
    moment()
      .utc()
      .endOf("day")
  );
  var startDate = new Date(
    moment(endDate)
      .utc()
      .subtract(1, "month")
      .startOf("day")
  );
  // startDate = new Date("2013-04-08T00:00:00Z");
  // endDate = new Date("2013-04-15T00:00:00Z"); createdAt
  console.log({ startDate, endDate });
  StaffMember.aggregate(
    [
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          list: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
      // { $match: { "createdAt": { $gte: startDate, $lt: endDate } } },
      // {
      //   $addFields: {
      //     createdAt: {
      //       $dateFromParts: {
      //         year: { $year: "$createdAt" },
      //         month: { $month: "$createdAt" },
      //         day: { $dayOfMonth: "$createdAt" }
      //       }
      //     },
      //     dateRange: {
      //       $map: {
      //         input: { $range: [0, { $subtract: [endDate, startDate] }, 1000 * 60 * 60 * 24] },
      //         in: { $add: [startDate, "$$this"] }
      //       }
      //     }
      //   }
      // },
      // { $unwind: "$dateRange" },
      // {
      //   $group: {
      //     _id: "$dateRange",
      //     sales: {
      //       $push: {
      //         $cond: [
      //           { $eq: ["$dateRange", "$createdAt"] },
      //           { isSubscribe: "$isSubscribe", count: 1 },
      //           { count: 0 }
      //         ]
      //       }
      //     }
      //   }
      // },
      // { $sort: { _id: 1 } },
      // {
      //   $project: {
      //     _id: 0,
      //     createdAt: "$_id",
      //     totalSold: { $sum: "$sales.count" },
      //     // byBrand: {
      //     //   $arrayToObject: {
      //     //     $reduce: {
      //     //       input: { $filter: { input: "$sales", cond: "$$this.count" } },
      //     //       initialValue: { $map: { input: { $setUnion: ["$sales.isSubscribe"] }, in: { k: "$$this", v: 0 } } },
      //     //       in: {
      //     //         $let: {
      //     //           vars: { t: "$$this", v: "$$value" },
      //     //           in: {
      //     //             $map: {
      //     //               input: "$$v",
      //     //               in: {
      //     //                 k: "$$this.k",
      //     //                 v: {
      //     //                   $cond: [
      //     //                     { $eq: ["$$this.k", "$$t.isSubscribe"] },
      //     //                     { $add: ["$$this.v", "$$t.count"] },
      //     //                     "$$this.v"
      //     //                   ]
      //     //                 }
      //     //               }
      //     //             }
      //     //           }
      //     //         }
      //     //       }
      //     //     }
      //     //   }
      //     // }
      //   }
      // }

      // { $addFields:
      //   { createdAt:
      //     { $dateFromParts:
      //       { year:
      //         { $year: "$createdAt" },
      //         month:
      //         { $month: "$createdAt" },
      //         day:
      //         { $dayOfMonth: "$createdAt" }
      //       }
      //     },
      //     dateRange:
      //     { $map:
      //       { input:
      //         { $range:
      //           [
      //             0,
      //             { $subtract:
      //               [endDate, startDate]
      //             },
      //             1000 * 60 * 60 * 24
      //           ]
      //         },
      //         in:
      //         { $add:
      //           [
      //             startDate,
      //             "$$this"
      //           ]
      //         }
      //       }
      //     }
      //   }
      // },
      // { $unwind: "$dateRange" },
      // {
      //   $group: {
      //     // _id: { date: "$dateRange", isSubscribe: "$isSubscribe" },
      //     _id: { date: "$dateRange" },
      //     count: { $sum: { $cond: [{ $eq: ["$dateRange", "$createdAt"] }, 1, 0] } }
      //   }
      // },
      // {
      //   $group: {
      //     _id: "$_id.date",
      //     total: { $sum: "$count" },
      //     // byBrand: { $push: { k: "$_id.isSubscribe", v: { $sum: "$count" } } }
      //   }
      // },
      // { $sort: { _id: 1 } },
      // {
      //   $project: {
      //     _id: 0,
      //     createdAt: "$_id",
      //     totalSold: "$total",
      //     // byBrand: { $arrayToObject: { $filter: { input: "$byBrand", cond: "$$this.v" } } }
      //   }
      // }
    ],
    (err, results) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = results;
        response.memberMessage = "Dashboard analytics fetched successfully.";
        return SendResponse(res);
      }
    }
  );
};

// methods.dashboardAnalytics = (req, res) => {
//   var page = req.query.page ? parseInt(req.query.page) : 1;
//   var pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;

//   async.parallel(
//     {
//       analytics: function(done) {
//         async.parallel(
//           {
//             totalQuizzes: function(callback) {
//               QuizSession.find({
//                 organisationId: req.staffMember.organisationId
//               })
//                 .count()
//                 .exec(callback);
//             },
//             currentQuizzes: function(callback) {
//               QuizSession.find({
//                 status: "ready",
//                 organisationId: req.staffMember.organisationId,
//                 expiredAt: { $gte: new Date() }
//               })
//                 .count()
//                 .exec(callback);
//             },
//             players: function(callback) {
//               membersQuiz.distinct("staffMemberId").exec((err, result) => {
//                 if (err) {
//                   return callback(err);
//                 }
//                 callback(null, result.length);
//               });
//             }
//           },
//           (err, results) => {
//             if (err) {
//               return done(err);
//             }
//             done(null, results);
//           }
//         );
//       },
//       quizData: function(done) {
//         async.parallel(
//           {
//             totalSize: function(callback) {
//               QuizSession.find({
//                 sessionType: "hosted",
//                 organisationId: "" + req.staffMember.organisationId
//               })
//                 .count()
//                 .exec((err, results) => {
//                   if (err) {
//                     return callback(err);
//                   }
//                   callback(null, results);
//                 });
//             },
//             quizzes: function(callback) {
//               QuizSession.aggregate([
//                 {
//                   $match: {
//                     sessionType: "hosted",
//                     organisationId: "" + req.staffMember.organisationId
//                   }
//                 },
//                 {
//                   $lookup: {
//                     from: "membersquizzes",
//                     localField: "_id",
//                     foreignField: "quizSessionId",
//                     as: "participants"
//                   }
//                 },
//                 {
//                   $lookup: {
//                     from: "quizzes",
//                     localField: "quizId",
//                     foreignField: "_id",
//                     as: "quiz"
//                   }
//                 },
//                 {
//                   $unwind: "$quiz"
//                 },
//                 {
//                   $skip: pageSize * (page - 1)
//                 },
//                 {
//                   $limit: pageSize
//                 },
//                 {
//                   $group: {
//                     _id: "$_id",
//                     participantsCount: {
//                       $sum: {
//                         $size: "$participants"
//                       }
//                     },
//                     questionsCount: {
//                       $sum: {
//                         $size: "$quiz.questions"
//                       }
//                     },
//                     quiz: {
//                       $last: "$quiz"
//                     },
//                     pin: {
//                       $last: "$pin"
//                     },
//                     status: {
//                       $last: "$status"
//                     },
//                     organizerId: {
//                       $last: "$organizerId"
//                     },
//                     createdAt: {
//                       $last: "$createdAt"
//                     },
//                     startedAt: {
//                       $last: "$startedAt"
//                     },
//                     finishedAt: {
//                       $last: "$finishedAt"
//                     }
//                   }
//                 },
//                 { $sort: { createdAt: -1 } },
//                 {
//                   $project: {
//                     participantsCount: 1,
//                     quiz: 1,
//                     status: 1,
//                     questionsCount: 1,
//                     createdAt: 1,
//                     startedAt: 1,
//                     finishedAt: 1,
//                     pin: 1
//                   }
//                 }
//               ]).exec((err, result) => {
//                 if (err) {
//                   done(err, []);
//                 } else {
//                   Quiz.populate(
//                     result,
//                     {
//                       path: "organizerId",
//                       model: "staffMember",
//                       select: "fullName avatar"
//                     },
//                     (err, quizzes) => {
//                       if (err) {
//                         return callback(err);
//                       }
//                       callback(null, quizzes);
//                     }
//                   );
//                 }
//               });
//             }
//           },
//           (err, results) => {
//             if (err) {
//               return done(err);
//             }
//             done(null, results);
//           }
//         );
//       }
//     },
//     (err, results) => {
//       if (err) {
//         //send response to user
//         response.error = true;
//         response.status = 500;
//         response.errors = err;
//         response.data = null;
//         response.page = page;
//         response.pageSize = pageSize;
//         response.memberMessage = "Some server error has occurred.";
//         return SendResponse(res);
//       } else {
//         //send response to user
//         response.error = false;
//         response.status = 200;
//         response.errors = null;
//         response.data = results;
//         response.page = page;
//         response.pageSize = pageSize;
//         response.memberMessage = "Dashboard analytics fetched successfully.";
//         return SendResponse(res);
//       }
//     }
//   );
// };

/*-----  End of dashboardAnalytics  ------*/
