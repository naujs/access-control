"use strict";

module.exports = function (args, ctx) {
  return !!ctx.user;
};