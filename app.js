const express = require("express");
const bodyParser = require("body-parser");
const initDatabaseConnection = require("./init_db");
const logger = require("./logger");

initDatabaseConnection();

const app = express();
exports.app = app;

if (process.env.ENVIRONMENT == "dev") {
  const cors = require("cors");
  app.use(cors());
}

app.use(bodyParser.json());

const userRouter = require("./routes/UserRoutes/userRoutes");
const partnerRestaurantRouter = require("./routes/PartnerRoutes/restaurantRoutes");
app.use("/user", userRouter);
app.use("/partner/restaurant", partnerRestaurantRouter);

var PORT = process.env.PORT || 6000;
app.listen(PORT, (err) => {
  if (err) console.log(`err while starting server ${err}`);
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
