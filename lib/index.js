'use strict';

/**
 * Module dependencies.
 */

var bind = require('component-bind');
var integration = require('@segment/analytics.js-integration');
var topDomain = require('@segment/top-domain');
var when = require('do-when');

/**
 * UMD?
 */

var umd = typeof window.define === 'function' && window.define.amd;

/**
 * Source.
 */

var src = '//d24n15hnbwhuhn.cloudfront.net/libs/amplitude-2.12.1-min.gz.js';

/**
 * Expose `Amplitude` integration.
 */

var Amplitude = module.exports = integration('Amplitude')
  .global('amplitude')
  .option('apiKey', '')
  .option('trackAllPages', false)
  .option('trackNamedPages', true)
  .option('trackCategorizedPages', true)
  .option('trackUtmProperties', true)
  .option('trackReferrer', false)
  .option('batchEvents', false)
  .option('eventUploadThreshold', 30)
  .option('eventUploadPeriodMillis', 30000)
  .tag('<script src="' + src + '">');

/**
 * Initialize.
 *
 * https://github.com/amplitude/Amplitude-Javascript
 *
 * @api public
 */

Amplitude.prototype.initialize = function() {
  /* eslint-disable */
  (function(e,t){var r=e.amplitude||{_q:[]};function n(e,t){e.prototype[t]=function(){this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}}var s=function(){this._q=[];return this};var i=["add","append","clearAll","prepend","set","setOnce","unset"];for(var o=0;o<i.length;o++){n(s,i[o])}r.Identify=s;var a=function(){this._q=[];return this;};var u=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"];for(var c=0;c<u.length;c++){n(a,u[c])}r.Revenue=a;var p=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId"];function l(e){function t(t){e[t]=function(){e._q.push([t].concat(Array.prototype.slice.call(arguments,0)));}}for(var r=0;r<p.length;r++){t(p[r])}}l(r);e.amplitude=r})(window,document);
  /* eslint-enable */

  this.setDomain(window.location.href);
  window.amplitude.init(this.options.apiKey, null, {
    includeUtm: this.options.trackUtmProperties,
    includeReferrer: this.options.trackReferrer,
    batchEvents: this.options.batchEvents,
    eventUploadThreshold: this.options.eventUploadThreshold,
    eventUploadPeriodMillis: this.options.eventUploadPeriodMillis
  });

  var loaded = bind(this, this.loaded);
  var ready = this.ready;
  // FIXME (wcjohnson11): Refactor the load method to include this logic
  // to better support if UMD present
  if (umd) {
    window.require([src], function(amplitude) {
      window.amplitude = amplitude;
      when(loaded, function() {
        window.amplitude.runQueuedFunctions();
        ready();
      });
    });
    return;
  }

  this.load(function() {
    when(loaded, function() {
      window.amplitude.runQueuedFunctions();
      ready();
    });
  });
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

Amplitude.prototype.loaded = function() {
  return !!(window.amplitude && window.amplitude.options);
};

/**
 * Page.
 *
 * @api public
 * @param {Page} page
 */

Amplitude.prototype.page = function(page) {
  var category = page.category();
  var name = page.fullName();
  var opts = this.options;

  // all pages
  if (opts.trackAllPages) {
    this.track(page.track());
  }

  // categorized pages
  if (category && opts.trackCategorizedPages) {
    this.track(page.track(category));
  }

  // named pages
  if (name && opts.trackNamedPages) {
    this.track(page.track(name));
  }
};

/**
 * Identify.
 *
 * @api public
 * @param {Facade} identify
 */

Amplitude.prototype.identify = function(identify) {
  var id = identify.userId();
  var traits = identify.traits();
  if (id) window.amplitude.setUserId(id);
  if (traits) window.amplitude.setUserProperties(traits);
};

/**
 * Track.
 *
 * @api public
 * @param {Track} event
 */

Amplitude.prototype.track = function(track) {
  var props = track.properties();
  var event = track.event();
  var revenue = track.revenue();

  // track the event
  window.amplitude.logEvent(event, props);

  // also track revenue
  if (revenue) {
    window.amplitude.logRevenue(revenue, props.quantity, props.productId);
  }
};

/**
 * Group.
 *
 * @api public
 * @param {Group} group
 */

Amplitude.prototype.group = function(group) {
  var groupId = group.groupId();
  if (groupId) window.amplitude.setGroup('[Segment] Group', groupId);
};

/**
 * Set domain name to root domain in Amplitude.
 *
 * @api private
 * @param {string} href
 */

Amplitude.prototype.setDomain = function(href) {
  var domain = topDomain(href);
  window.amplitude.setDomain(domain);
};

/**
 * Override device ID in Amplitude.
 *
 * @api private
 * @param {string} deviceId
 */

Amplitude.prototype.setDeviceId = function(deviceId) {
  if (deviceId) window.amplitude.setDeviceId(deviceId);
};
