'use strict';

/**
 * series service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::series.series');
