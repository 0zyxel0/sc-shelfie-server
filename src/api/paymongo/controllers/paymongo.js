// src/api/paymongo/controllers/paymongo.js

"use strict";

// --- Server-side source of truth for pricing ---
const PLANS = {
  monthly: {
    name: "Shelfie Premium (Monthly)",
    amount: 20000,
    currency: "PHP",
  },
  annually: {
    name: "Shelfie Premium (Annually)",
    amount: 220800,
    currency: "PHP",
  },
};
const axios = require("axios");
module.exports = {
  /**
   * Creates a PayMongo Checkout Session
   */
  async createCheckoutSession(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("You must be logged in to make a purchase.");
    }

    const { plan } = ctx.request.body;
    const selectedPlan = PLANS[plan];
    if (!selectedPlan) {
      return ctx.badRequest("Invalid subscription plan selected.");
    }
    console.log("Creating PayMongo Checkout Session for user:", user.id, "Plan:", plan);

    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    const encodedStringBtoA = btoa(paymongoSecretKey);
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      authorization: `Basic ${encodedStringBtoA}`,
    };

    const order_payload = {
      data: {
        attributes: {
          billing: {
            email: user.email,
            name: user.username,
          },
          send_email_receipt: true,
          show_line_items: true,
          line_items: [
            {
              currency: selectedPlan.currency,
              amount: selectedPlan.amount,
              name: selectedPlan.name,
              quantity: 1,
            },
          ],
          payment_method_types: ["card", "gcash", "paymaya", "grab_pay"],
          // IMPORTANT: These URLs point back to your Nuxt app
          success_url: `${process.env.FRONTEND_URL}/premium/success`,
          cancel_url: `${process.env.FRONTEND_URL}/premium/cancelled`,
          // CRUCIAL: Store user ID and plan in metadata for the webhook
          metadata: {
            strapiUserId: user.id,
            plan,
          },
        },
      },
    };

    try {
      const response = await axios.post("https://api.paymongo.com/v1/checkout_sessions", JSON.stringify(order_payload), { headers });

      console.log("PayMongo Checkout Session Response:", response.data);

      const checkoutSession = response.data.data;
      const checkoutUrl = checkoutSession?.attributes?.checkout_url;
      const checkoutSessionId = checkoutSession?.id; // Get the session ID

      if (!checkoutUrl || !checkoutSessionId) {
        throw new Error("Failed to retrieve checkout URL or Session ID from PayMongo.");
      }

      // MODIFIED: Return both the URL and the session ID
      return {
        checkoutUrl,
        checkoutSessionId,
      };
    } catch (error) {
      console.error("PayMongo Checkout Error:", error.data || error.message);
      return ctx.internalServerError("Could not create a payment session.", { details: error.data });
    }
  },

  /**
   * NEW: Verifies a payment session after client-side redirect
   */
  /**
   * Verifies a payment session and creates a subscription record.
   */
  async verifyPaymentSession(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Authentication required to verify a payment.");
    }

    const { checkoutSessionId } = ctx.request.body;
    if (!checkoutSessionId) {
      return ctx.badRequest("Checkout Session ID is required.");
    }

    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    const base64ApiKey = btoa(paymongoSecretKey);
    const headers = { accept: "application/json", authorization: `Basic ${base64ApiKey}` };

    try {
      // 1. Retrieve the Checkout Session from PayMongo
      const session = await axios.get(`https://api.paymongo.com/v1/checkout_sessions/${checkoutSessionId}`, { headers });

      const checkoutSession = session.data.data;
      const paymentStatus = checkoutSession?.attributes?.payment_intent?.attributes?.status;
      const metadata = checkoutSession?.attributes?.metadata;

      // 2. CRUCIAL SECURITY CHECK: Ensure the session belongs to the logged-in user
      if (metadata?.strapiUserId != user.id) {
        return ctx.forbidden("This payment session does not belong to the authenticated user.");
      }

      // 3. Check if payment succeeded
      if (paymentStatus === "succeeded") {
        const plan = metadata.plan;
        if (!plan) {
          return ctx.badRequest("Payment session is missing required metadata (plan).");
        }

        // --- NEW LOGIC MOVED FROM FRONTEND ---

        // 4. Calculate the expiration date
        const expiryDate = new Date();
        if (plan === "annually") {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        // Get the subscription ID from PayMongo, if it exists (for recurring plans)
        const providerSubscriptionId = checkoutSession?.attributes?.subscription_id || null;

        // 5. Create the new subscription record in Strapi
        // The API ID for a 'subscription' collection is 'api::subscription.subscription'
        await strapi.entityService.create("api::subscription.subscription", {
          data: {
            user: user.id,
            plan: plan,
            subscriptionStatus: "active",
            expiresAt: expiryDate.toISOString(),
            providerSubscriptionId: providerSubscriptionId,
            lastCheckoutSessionId: checkoutSessionId,
          },
        });

        // 6. (Recommended) Update the user's record for quick access
        // This is a great pattern for easily checking if a user is premium
        // without having to query the subscriptions table every time.
        await strapi.entityService.update("plugin::users-permissions.user", user.id, {
          data: {
            isPremium: true,
            // You could add a direct relation here if you have one set up
          },
        });

        // --- END OF NEW LOGIC ---

        console.log(`Successfully created subscription for user ${user.id} with plan ${plan}.`);
        return {
          success: true,
          message: "Payment verified and subscription activated.",
        };
      } else {
        return ctx.badRequest(`Payment not successful. Status: ${paymentStatus}`);
      }
    } catch (error) {
      // Check for specific Strapi validation errors vs. general errors
      if (error.name === "ValidationError") {
        console.error("Strapi Validation Error:", error.details);
        return ctx.internalServerError("Failed to create subscription due to invalid data.", { details: error.details });
      }
      console.error("PayMongo Verification Error:", error.data || error.message);
      return ctx.internalServerError("Could not verify the payment session.", { details: error.data });
    }
  },
};
