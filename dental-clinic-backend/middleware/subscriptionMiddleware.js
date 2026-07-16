const { Subscription, Plan } = require("../models");

async function subscriptionMiddleware(req, res, next) {
  const subscription = await Subscription.findOne({
    where: { clinic_id: req.clinicId },
    include: [{ model: Plan, as: "plan" }],
    order: [["created_at", "DESC"]],
  });

  if (!subscription || subscription.status === "cancelled" || subscription.status === "expired") {
    return res.status(402).json({
      message: "No active subscription",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  if (subscription.status === "trial" && subscription.trial_ends_at && new Date() > subscription.trial_ends_at) {
    await subscription.update({ status: "expired" });
    return res.status(402).json({
      message: "Trial expired",
      code: "TRIAL_EXPIRED",
    });
  }

  if (subscription.current_period_end && new Date() > subscription.current_period_end) {
    await subscription.update({ status: "expired" });
    return res.status(402).json({
      message: "Subscription expired",
      code: "SUBSCRIPTION_EXPIRED",
    });
  }

  req.subscription = subscription;
  req.plan = subscription.plan;
  next();
}

module.exports = subscriptionMiddleware;
