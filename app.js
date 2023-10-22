const express = require("express");
const { RestaurantModel, UserModel } = require("./models");
const { RestaurantAnalyticsModel } = require("./analytics/models");
const haversine = require("haversine-distance");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const MiniSearch = require("minisearch");
const initDatabaseConnection = require("./init_db");
const logger = require("./logger");
const { getCoordinatesFromGmapLink } = require("./utils");

initDatabaseConnection();

const app = express();

if (process.env.ENVIRONMENT == "dev") {
  const cors = require("cors");
  app.use(cors());
}

app.use(bodyParser.json());

app.get("/user/:uid", async (req, res) => {
  const uid = req.params.uid;

  const user = await UserModel.findOne({ uid: uid });
  if (!user) return res.status(200).json({ isNewUser: true });

  return res.status(200).json(user);
});

app.post("/user/", async (req, res) => {
  // TODO: validations
  const user = new UserModel(req.body);
  await user.save();
  return res.status(200).json(user);
});

app.post("/restaurant", async (req, res) => {
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

  //TODO: validate that map link should be of google maps only
  const gmapLink = body.location.gmapLink;
  const coordinates = await getCoordinatesFromGmapLink(gmapLink);
  const location = {
    gmapLink: gmapLink,
    latitude: coordinates["lat"],
    longitude: coordinates["long"],
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

  await restaurant.save();
  return res.status(200).json(restaurant);
});

var PORT = process.env.PORT || 6000;
app.listen(PORT, (err) => {
  if (err) console.log(`err while starting server ${err}`);
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
