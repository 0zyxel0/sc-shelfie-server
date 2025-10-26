// src/api/paymongo/routes/paymongo.js

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/paymongo/create-checkout-session",
      handler: "paymongo.createCheckoutSession",
      // REMOVE THE ENTIRE 'config' BLOCK FROM HERE
    },
    {
      method: "POST",
      path: "/paymongo/verify-payment",
      handler: "paymongo.verifyPaymentSession",
      // AND REMOVE THE 'config' BLOCK FROM HERE AS WELL
    },
  ],
};
