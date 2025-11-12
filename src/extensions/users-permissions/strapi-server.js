"use strict";

module.exports = (plugin) => {
  // --- 1. Create the custom controller ---
  const originalController = plugin.controllers.user;

  plugin.controllers.user.follow = async (ctx) => {
    // The user who is being followed
    const { id: userToFollowId } = ctx.params;
    // The currently authenticated user (the one performing the action)
    const { id: currentUserId } = ctx.state.user;

    if (userToFollowId === currentUserId.toString()) {
      return ctx.badRequest("You cannot follow yourself.");
    }

    // Use the entity service to update the current user's `following` relation
    await strapi.entityService.update("plugin::users-permissions.user", currentUserId, {
      data: {
        following: {
          connect: [userToFollowId], // The `connect` API adds the relation
        },
      },
    });

    return ctx.send({ message: "Successfully followed user." });
  };

  plugin.controllers.user.unfollow = async (ctx) => {
    const { id: userToUnfollowId } = ctx.params;
    const { id: currentUserId } = ctx.state.user;

    // Use the entity service to update the current user's `following` relation
    await strapi.entityService.update("plugin::users-permissions.user", currentUserId, {
      data: {
        following: {
          disconnect: [userToUnfollowId], // The `disconnect` API removes the relation
        },
      },
    });

    return ctx.send({ message: "Successfully unfollowed user." });
  };

  plugin.controllers.user.updateMeProfile = async (ctx) => {
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized("Authentication required.");
    }

    // Extract payload from the request body
    const { displayName, birthDate, profilePicture } = ctx.request.body;

    // Optional: Basic field validation
    if (!displayName || !birthDate) {
      return ctx.badRequest("Display Name and Birth Date are required.");
    }

    try {
      const updateData = {
        displayName,
        birthDate: birthDate,
      };

      // Handle the optional profile picture update
      // profilePicture should be an integer ID or null
      if (profilePicture !== undefined) {
        updateData.profilePicture = profilePicture;
      }

      // Use entityService to update the user model
      const updatedUser = await strapi.entityService.update(
        "plugin::users-permissions.user", // Target the user model
        userId,
        {
          data: updateData,
          // IMPORTANT: Populate necessary relations for the front end (e.g., profile picture)
          populate: ["profilePicture"],
        }
      );

      // Return the updated user object
      return updatedUser;
    } catch (error) {
      strapi.log.error("Extended user profile update failed:", error);
      // Check if it's a validation error (e.g., uniqueness constraint)
      if (error.details?.errors) {
        return ctx.badRequest("Validation failed.", { details: error.details.errors });
      }
      return ctx.internalServerError("Profile update failed due to a server error.");
    }
  };

  plugin.controllers.user.resendVerificationEmail = async (ctx) => {
    const { id: currentUserId, email, confirmed } = ctx.state.user; // Get authenticated user's info

    if (confirmed) {
      return ctx.badRequest("This account is already confirmed.");
    }

    try {
      // Use Strapi's built-in service to send the confirmation email
      await strapi.service("plugin::users-permissions.user").sendConfirmationEmail({
        id: currentUserId,
        email,
      });
      return ctx.send({ message: "Confirmation email resent successfully." });
    } catch (err) {
      return ctx.badRequest(err.message);
    }
  };

  // --- 2. Create the custom routes ---
  plugin.routes["content-api"].routes.push(
    {
      method: "POST",
      path: "/users/:id/follow",
      handler: "user.follow",
      config: {
        prefix: "", // No prefix, so the path is exactly as written
      },
    },
    {
      method: "POST",
      path: "/users/:id/unfollow",
      handler: "user.unfollow",
      config: {
        prefix: "",
      },
    },
    {
      method: "POST",
      path: "/users/resend-verification-email",
      handler: "user.resendVerificationEmail",
      config: {
        prefix: "",
      },
    },
    {
      method: "PUT",
      path: "/users/me/profile", // A clear, dedicated route
      handler: "user.updateMeProfile", // Handler points to the method created above
      config: {
        prefix: "",
      },
    }
  );

  return plugin;
};
