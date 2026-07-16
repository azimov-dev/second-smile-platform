const db = require("../models");
const { verifyPrepareSign, verifyCompleteSign } = require("../utils/clickHelper");

// Click error codes
const CLICK_OK = 0;
const CLICK_SIGN_ERROR = -1;
const CLICK_INVALID_AMOUNT = -2;
const CLICK_ACTION_NOT_FOUND = -3;
const CLICK_ALREADY_PAID = -4;
const CLICK_TRANSACTION_CANCELLED = -5;
const CLICK_TRANSACTION_NOT_FOUND = -6;

exports.prepare = async (req, res) => {
  try {
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      amount,
      action,
      error: clickError,
      error_note,
      sign_time,
      sign_string,
    } = req.body;

    if (!verifyPrepareSign(req.body)) {
      return res.json({ error: CLICK_SIGN_ERROR, error_note: "Invalid sign" });
    }

    const subscription = await db.Subscription.findByPk(merchant_trans_id, {
      include: [{ model: db.Plan, as: "plan" }],
    });

    if (!subscription) {
      return res.json({ error: CLICK_ACTION_NOT_FOUND, error_note: "Subscription not found" });
    }

    const expectedAmount = subscription.plan.price_monthly;
    if (Math.abs(Number(amount) - expectedAmount) > 1) {
      return res.json({ error: CLICK_INVALID_AMOUNT, error_note: "Incorrect amount" });
    }

    if (Number(clickError) < 0) {
      return res.json({ error: CLICK_TRANSACTION_CANCELLED, error_note: "Transaction cancelled by Click" });
    }

    const existing = await db.SubscriptionPayment.findOne({
      where: { click_trans_id: String(click_trans_id), status: "completed" },
    });
    if (existing) {
      return res.json({ error: CLICK_ALREADY_PAID, error_note: "Already paid" });
    }

    await db.SubscriptionPayment.create({
      subscription_id: subscription.id,
      clinic_id: subscription.clinic_id,
      amount: Number(amount),
      currency: "UZS",
      click_trans_id: String(click_trans_id),
      click_merchant_trans_id: String(merchant_trans_id),
      status: "pending",
      raw_response: req.body,
    });

    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: subscription.id,
      error: CLICK_OK,
      error_note: "Success",
    });
  } catch (err) {
    console.error("Click prepare error:", err);
    return res.json({ error: CLICK_ACTION_NOT_FOUND, error_note: "Internal error" });
  }
};

exports.complete = async (req, res) => {
  try {
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      error: clickError,
      error_note,
      sign_time,
      sign_string,
    } = req.body;

    if (!verifyCompleteSign(req.body)) {
      return res.json({ error: CLICK_SIGN_ERROR, error_note: "Invalid sign" });
    }

    const payment = await db.SubscriptionPayment.findOne({
      where: { click_trans_id: String(click_trans_id), status: "pending" },
    });

    if (!payment) {
      return res.json({ error: CLICK_TRANSACTION_NOT_FOUND, error_note: "Payment not found" });
    }

    if (Number(clickError) < 0) {
      await payment.update({ status: "failed", raw_response: req.body });
      return res.json({ error: CLICK_TRANSACTION_CANCELLED, error_note: "Cancelled" });
    }

    await payment.update({ status: "completed", paid_at: new Date(), raw_response: req.body });

    const subscription = await db.Subscription.findByPk(payment.subscription_id);
    if (subscription) {
      const now = new Date();
      const newEnd = new Date(now);
      newEnd.setMonth(newEnd.getMonth() + 1);

      await subscription.update({
        status: "active",
        current_period_start: now,
        current_period_end: newEnd,
      });
    }

    return res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: payment.id,
      error: CLICK_OK,
      error_note: "Success",
    });
  } catch (err) {
    console.error("Click complete error:", err);
    return res.json({ error: CLICK_ACTION_NOT_FOUND, error_note: "Internal error" });
  }
};
