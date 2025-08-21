module.exports = ({ env }) => ({
  meilisearch: {
    config: {
      // Your Meilisearch server credentials
      host: env("MEILISEARCH_HOST", "http://localhost:7700"),
      apiKey: env("MEILISEARCH_API_KEY", "aVeryLongAndSecureMasterKey"),

      // Registering the 'Item' content type for indexing
      item: {
        indexName: "items", // The name of the index in Meilisearch

        // A function to transform the data before sending to Meilisearch
        transformEntry({ entry }) {
          // Let's create a clean, flat object for easy searching
          const transformed = {
            id: entry.id,
            documentId: entry.documentId,
            name: entry.name,
            description: entry.description,
            status: entry.itemStatus,
            manufacturer: entry.manufacturer?.name,
            character: entry.character?.name,
            series: entry.series?.name,
            categories: (entry.categories || []).map((c) => c.name),
            tags: (entry.tags || []).map((t) => t.name),
            user: {
              // We need the user for the item card
              username: entry.user?.username,
            },
            userImages: entry.userImages || [], // Keep the image objects
          };
          return transformed;
        },

        // Only index items that are NOT private
        filterEntry({ entry }) {
          return entry.isPrivate === false;
        },

        // Meilisearch index settings
        settings: {
          searchableAttributes: ["name", "character", "series", "manufacturer", "tags", "categories"],
          sortableAttributes: ["createdAt"],
          filterableAttributes: ["status", "manufacturer", "character", "series"],
        },
      },
    },
  },
});
