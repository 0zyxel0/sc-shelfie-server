// ./src/extensions/users-permissions/server/controllers/user.js

"use strict";

const { sanitize } = require("@strapi/utils");

module.exports = {
  /**
   * This is a custom override of the default update user function.
   * It allows a logged-in user to update their own 'subscriptionType'.
   */
  async update(ctx) {
    const { id } = ctx.params; // The ID of the user to update
    const authenticatedUserId = ctx.state.user.id; // The ID of the user making the request
    const { body } = ctx.request; // The data sent in the request

    // --- SECURITY CHECK ---
    // Ensure the logged-in user is only trying to update their own profile
    if (Number(id) !== authenticatedUserId) {
      return ctx.unauthorized("You can only update your own profile.");
    }

    // --- PERMISSION LOGIC ---
    // We only want to allow specific fields to be updated by the user.
    // This prevents them from changing their role, email, etc.
    const allowedFieldsToUpdate = {
      subscriptionType: body.subscriptionType,
      // You could add other self-editable fields here, e.g.,
      // username: body.username,
    };

    // Remove any undefined properties so we only update what was actually sent
    Object.keys(allowedFieldsToUpdate).forEach((key) => {
      if (allowedFieldsToUpdate[key] === undefined) {
        delete allowedFieldsToUpdate[key];
      }
    });

    // Use the Entity Service to update the user in the database
    const updatedUser = await strapi.entityService.update("plugin::users-permissions.user", id, {
      data: allowedFieldsToUpdate,
    });

    // Sanitize the output before sending it back to the client
    const sanitizedUser = await sanitize.contentAPI.output(updatedUser, strapi.getModel("plugin::users-permissions.user"));

    ctx.body = sanitizedUser;
  },
};
