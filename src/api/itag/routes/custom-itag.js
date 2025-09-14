module.exports = {
  routes: [
    {
      method: "GET",
      path: "/itags/top", // Use the new API ID `itags`
      handler: "itag.findTop", // Point to the `itag` controller
    },
  ],
};
