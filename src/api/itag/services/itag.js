'use strict';

/**
 * itag service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::itag.itag');
