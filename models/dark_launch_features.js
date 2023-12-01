const mongoose = require("mongoose");
const {
  EmbeddedDocSchema,
  BaseModelSchema,
  StrModelChoices,
} = require("./base");

const DarkLaunchFeatureSchema = new BaseModelSchema({
  featureName: { type: String, required: true },
  isEnabledInDevelopment: { type: Boolean, required: true, default: false },
  isEnabledInProduction: { type: Boolean, required: true, default: false },
});

const DarkLaunchFeaturesList = ["IGNORE_STATE_FOR_RES_CHOICES"];
const DarkLaunchFeatures = StrModelChoices([...DarkLaunchFeaturesList]);

const DarkLaunchFeaturesDefaults = {};
DarkLaunchFeaturesDefaults[DarkLaunchFeatures.IGNORE_STATE_FOR_RES_CHOICES] = {
  isEnabledInDevelopment: true,
  isEnabledInProduction: true,
};

DarkLaunchFeatureSchema.statics.isEnabled = async function (featureName) {
  let feature = await DarkLaunchFeatureModel.get_object({
    featureName: featureName,
  });
  if (!feature) {
    feature = new DarkLaunchFeatureModel({
      featureName: featureName,
      ...(DarkLaunchFeaturesDefaults[featureName] ?? {}),
    });
    await feature.save();
  }
  if (process.env.ENVIRONMENT == "production") {
    return feature.isEnabledInProduction;
  } else if (process.env.ENVIRONMENT == "development") {
    return feature.isEnabledInDevelopment;
  }

  return false;
};

const DarkLaunchFeatureModel = mongoose.model(
  "DarkLaunchFeature",
  DarkLaunchFeatureSchema
);
module.exports = { DarkLaunchFeatureModel, DarkLaunchFeatures };
