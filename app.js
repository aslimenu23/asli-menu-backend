const express = require("express");
const { RestaurantModel, UserModel } = require("./models");
const { RestaurantAnalyticsModel } = require("./analytics/models");
const haversine = require("haversine-distance");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const MiniSearch = require("minisearch");
const initDatabaseConnection = require("./init_db");

initDatabaseConnection();

const app = express();
app.use(bodyParser.json());

app.get("/user/", async (req, res) => {
  const phone = req.body.phoneNumber;
  // TODO: validations
  if (!phone) {
    return res.status(400).send("Phone number required");
  }

  try {
    const user = await UserModel.findOne({ phoneNumber: phone });
    return res.status(200).json(user);
  } catch (error) {
    console.log("error");
  }
});

app.post("/user/", async (req, res) => {
  // TODO: validations
  const user = new UserModel(req.body);
  await user.save();
  return res.status(200).json(user);
});

app.post("/restaurants/add", async (req, res) => {
  let body = req.body;

  let restaurant = new RestaurantModel({
    name: body.name,
    description: body.description,
    cuisines: body.cuisines,
    contacts: body.contacts,
    avgPrice: body.avgPrice,
    facilities: body.facilities,
    metadata: body.metadata,
  });

  const mapLink = body.location.gmapLink;
  // TODO: convert mapLink to coordinates
  const location = {
    gmapLink: mapLink,
    latitude: 0,
    longitude: 0,
    areaName: body.location.areaName,
    fullAddress: body.location.fullAddress,
  };
  restaurant.location = location;

  restaurant.dineInDetails = body.dineInDetails;

  if (body.takeAwayDetails) {
    if (body.takeAwayDetails.sameAsDineIn) {
      delete body.takeAwayDetails.sameAsDineIn;
      restaurant.takeAwayDetails = restaurant.dineInDetails;
    } else restaurant.takeAwayDetails = body.takeAwayDetails;
  }

  if (body.deliveryDetails) {
    if (body.deliveryDetails.sameAsDineIn) {
      delete body.deliveryDetails.sameAsDineIn;
      restaurant.deliveryDetails = {
        ...restaurant.dineInDetails,
        ...body.deliveryDetails,
      };
    } else restaurant.takeAwayDetails = body.takeAwayDetails;
  }
});

var PORT = process.env.PORT || 6000;
app.listen(PORT, (err) => {
  if (err) console.log(`err while starting server ${err}`);
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
