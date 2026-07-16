const crypto = require("crypto");

const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID;
const CLICK_MERCHANT_ID = process.env.CLICK_MERCHANT_ID;
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY;

function generateChecksum(clickTransId, serviceId, secretKey, merchantTransId, amount, action) {
  const str = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

function verifyPrepareSign(params) {
  const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_string } = params;
  const expected = generateChecksum(click_trans_id, service_id, CLICK_SECRET_KEY, merchant_trans_id, amount, action);
  return expected === sign_string;
}

function verifyCompleteSign(params) {
  const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_string } = params;
  const expected = generateChecksum(click_trans_id, service_id, CLICK_SECRET_KEY, merchant_trans_id, amount, action);
  return expected === sign_string;
}

function buildCheckoutUrl({ subscriptionId, amount, returnUrl }) {
  const params = new URLSearchParams({
    service_id: CLICK_SERVICE_ID,
    merchant_id: CLICK_MERCHANT_ID,
    amount: String(amount),
    transaction_param: String(subscriptionId),
    return_url: returnUrl || `https://second-smile.uz`,
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

module.exports = { verifyPrepareSign, verifyCompleteSign, buildCheckoutUrl };
