const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const initDatabaseConnection = require("./init_db");
const logger = require("./logger");
const userRouter = require("./routes/UserRoutes/userRoutes");
const partnerRestaurantRouter = require("./routes/PartnerRoutes/restaurantRoutes");

initDatabaseConnection();

const app = express();

if (process.env.ENVIRONMENT == "dev") {
  app.use(cors());
} else {
  app.use(
    cors({
      origin: ["https://partner.aslimenu.com"],
    })
  );
}

app.use(bodyParser.json());

app.use("/user", userRouter);
app.use("/partner/restaurant", partnerRestaurantRouter);

var PORT = process.env.PORT || 6000;
app.listen(PORT, (err) => {
  if (err) console.log(`err while starting server ${err}`);
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
