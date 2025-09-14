"use strict";
const { createCoreController } = require("@strapi/strapi").factories;

// Update the core controller it's extending
module.exports = createCoreController("api::itag.itag", ({ strapi }) => ({
  async findTop(ctx) {
    try {
      // Use the correct collection name: `api::itag.itag`
      const allTags = await strapi.entityService.findMany("api::itag.itag", {
        populate: {
          items: {
            fields: ["id"],
          },
        },
      });

      const tagsWithCounts = allTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        itemCount: tag.items.length,
      }));

      const sortedTags = tagsWithCounts.filter((tag) => tag.itemCount > 0).sort((a, b) => b.itemCount - a.itemCount);

      const topTags = sortedTags.slice(0, 20);

      const sanitizedTags = await this.sanitizeOutput(topTags, ctx);
      return this.transformResponse(sanitizedTags);
    } catch (err) {
      ctx.body = err;
    }
  },
}));
