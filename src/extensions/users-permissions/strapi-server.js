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
    }
  );

  return plugin;
};
