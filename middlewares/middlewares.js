const { UserModel, UserWithRestaurantModel } = require("../models/models");

async function validateUserMiddleware(req, res, next) {
  const userId = req.headers.user;
  if (!userId)
    return res.status(403).send("This route requires authenticated user");

  const user = await UserModel.get_object({ id: userId });
  if (!user) return res.status(403).send("Invalid UserId in request headers");
  req.user = user;
  next();
}

async function validateUserHasAccessToRestaurant(req, res, next) {
  if (!req.user.isAdmin) {
    const userWithRestaurant = await UserWithRestaurantModel.get_object({
      user: req.user.id,
      restaurant: req.params.id,
    });
    if (!userWithRestaurant)
      return res
        .status(403)
        .send("User does not have access to this restaurant");
  }
  next();
}

function validateAdminUser(req, res, next) {
  if (!req.user?.isAdmin)
    return res.status(403).send("This route requires admin access");
  next();
}

module.exports = {
  validateUserMiddleware,
  validateUserHasAccessToRestaurant,
  validateAdminUser,
};
