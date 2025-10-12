module.exports = ({ env }) => ({
   upload: {
    config: {
      provider: "@strapi-community/strapi-provider-upload-google-cloud-storage",
      providerOptions: {
        bucketName: env("GOOGLE_STORAGE_BUCKETNAME"),
        publicFiles: true,
        uniform: false,
        serviceAccount: env.json("GCS_SERVICE_ACCOUNT"),
        basePath: "",
      },
    },
  },
  // end of comment
  email: {
    config: {
      provider: "sendgrid",
      providerOptions: {
        apiKey: env("SENDGRID_API_KEY"),
      },
      settings: {
        defaultFrom: env("SENDGRID_DEFAULT_FROM"),
        defaultReplyTo: env("SENDGRID_DEFAULT_REPLYTO"),
      },
    },
  },
  meilisearch: {
    config: {
      // Your meili host
      host: env("MEILI_SEARCH_BASEURL"),
      // Your master key or private key
      apiKey: env("MEILI_SEARCH_APIKEY"),
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
          searchableAttributes: ["name", "character", "series", "manufacturer", "itags", "categories"],
          sortableAttributes: ["createdAt"],
          filterableAttributes: ["status", "manufacturer", "character", "series"],
        },
      },
    },
  },
});
