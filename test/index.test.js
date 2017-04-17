'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var integration = require('@segment/analytics.js-integration');
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var Amplitude = require('../lib/');

describe('Amplitude', function() {
  var amplitude;
  var analytics;
  var options = {
    apiKey: '07808866adb2510adf19ee69e8fc2201',
    trackUtmProperties: true,
    trackReferrer: false,
    batchEvents: false,
    eventUploadThreshold: 30,
    eventUploadPeriodMillis: 30000,
    forceHttps: false,
    trackGclid: false,
    saveParamsReferrerOncePerSession: true,
    deviceIdFromUrlParam: false,
    mapQueryParams: {}
  };

  beforeEach(function() {
    analytics = new Analytics();
    amplitude = new Amplitude(options);
    analytics.use(Amplitude);
    analytics.use(tester);
    analytics.add(amplitude);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    amplitude.reset();
    sandbox();
  });

  it('should have the right settings', function() {
    analytics.compare(Amplitude, integration('Amplitude')
      .global('amplitude')
      .option('apiKey', '')
      .option('trackAllPages', false)
      .option('trackUtmProperties', true)
      .option('trackNamedPages', true)
      .option('trackReferrer', false)
      .option('batchEvents', false)
      .option('eventUploadThreshold', 30)
      .option('eventUploadPeriodMillis', 30000)
      .option('forceHttps', false)
      .option('trackGclid', false)
      .option('saveParamsReferrerOncePerSession', true)
      .option('deviceIdFromUrlParam', false));
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(amplitude, 'load');
    });

    afterEach(function() {
      amplitude.reset();
    });

    describe('#initialize', function() {
      it('should create window.amplitude', function() {
        analytics.assert(!window.amplitude);
        analytics.initialize();
        analytics.page();
        analytics.assert(window.amplitude);
      });

      it('should call load', function() {
        amplitude.initialize();
        analytics.called(amplitude.load);
      });
    });
  });

  describe('loading', function() {
    it('should load', function(done) {
      analytics.load(amplitude, done);
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    it('should init with right options', function() {
      analytics.assert(window.amplitude.options.includeUtm === options.trackUtmProperties);
      analytics.assert(window.amplitude.options.includeReferrer === options.trackReferrer);
      analytics.assert(window.amplitude.options.batchEvents === options.batchEvents);
      analytics.assert(window.amplitude.options.eventUploadThreshold === options.eventUploadThreshold);
      analytics.assert(window.amplitude.options.eventUploadPeriodMillis === options.eventUploadPeriodMillis);
      analytics.assert(window.amplitude.options.forceHttps === options.forceHttps);
      analytics.assert(window.amplitude.options.includeGclid === options.trackGclid);
      analytics.assert(window.amplitude.options.saveParamsReferrerOncePerSession === options.saveParamsReferrerOncePerSession);
      analytics.assert(window.amplitude.options.deviceIdFromUrlParam === options.deviceIdFromUrlParam);
    });

    it('should set api key', function() {
      analytics.assert(window.amplitude.options.apiKey === options.apiKey);
    });

    describe('#setDomain', function() {
      it('should set domain', function() {
        analytics.spy(amplitude, 'setDomain');
        analytics.initialize();
        analytics.page();
        analytics.called(amplitude.setDomain, window.location.href);
      });
    });

    describe('#setDeviceId', function() {
      it('should call window.amplitude.setDeviceId', function() {
        analytics.spy(window.amplitude, 'setDeviceId');
        amplitude.setDeviceId('deviceId');
        analytics.called(window.amplitude.setDeviceId, 'deviceId');
      });
    });

    describe('#_initUtmData', function() {
      it('should initialize utm properties', function() {
        amplitude.options.trackUtmProperties = true;
        analytics.once('ready', function() {
          analytics.spy(window.amplitude, '_initUtmData');
          analytics.called(window.amplitude._initUtmData);
        });
      });

      it('should not track utm properties if disabled', function() {
        analytics.spy(window.amplitude, '_initUtmData');
        analytics.didNotCall(window.amplitude._initUtmData);
      });
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window.amplitude, 'logEvent');
        analytics.stub(window.amplitude, 'setUserProperties');
      });

      it('should not track unnamed pages by default', function() {
        analytics.page();
        analytics.didNotCall(window.amplitude.logEvent);
      });

      it('should track unnamed pages if enabled', function() {
        amplitude.options.trackAllPages = true;
        analytics.page();
        analytics.called(window.amplitude.logEvent, 'Loaded a Page');
      });

      it('should track named pages by default', function() {
        analytics.page('Name');
        analytics.called(window.amplitude.logEvent, 'Viewed Name Page');
      });

      it('should track named pages with a category added', function() {
        analytics.page('Category', 'Name');
        analytics.called(window.amplitude.logEvent, 'Viewed Category Name Page');
      });

      it('should track categorized pages by default', function() {
        analytics.page('Category', 'Name');
        analytics.called(window.amplitude.logEvent, 'Viewed Category Page');
      });

      it('should not track name or categorized pages if disabled', function() {
        amplitude.options.trackNamedPages = false;
        amplitude.options.trackCategorizedPages = false;
        analytics.page('Category', 'Name');
        analytics.didNotCall(window.amplitude.logEvent);
      });

      it('should map query params to custom property as user properties', function() {
        amplitude.options.trackAllPages = true;
        amplitude.options.mapQueryParams = { customProp: 'user_properties' };
        analytics.page({}, { page: { search: '?suh=dude' } });
        analytics.called(window.amplitude.setUserProperties, { customProp: '?suh=dude' });
      });

      it('should map query params to custom property as event properties', function() {
        amplitude.options.trackAllPages = true;
        amplitude.options.mapQueryParams = { params: 'event_properties' };
        analytics.page({ referrer: document.referrer }, { page: { search: '?suh=dude' } });
        analytics.called(window.amplitude.logEvent, 'Loaded a Page', {
          params: '?suh=dude',
          path: '/context.html',
          referrer: document.referrer,
          search: '', // in practice this would also be set to the query param but limitation of test prevents this from being set
          title: '',
          url: 'http://localhost:9876/context.html'
        });
      });
    });

    describe('#identify', function() {
      beforeEach(function() {
        analytics.stub(window.amplitude, 'setUserId');
        analytics.stub(window.amplitude, 'setUserProperties');
      });

      it('should send an id', function() {
        analytics.identify('id');
        analytics.called(window.amplitude.setUserId, 'id');
      });

      it('should send traits', function() {
        analytics.identify({ trait: true });
        analytics.called(window.amplitude.setUserProperties, { trait: true });
      });

      it('should send an id and traits', function() {
        analytics.identify('id', { trait: true });
        analytics.called(window.amplitude.setUserId, 'id');
        analytics.called(window.amplitude.setUserProperties, { id: 'id', trait: true });
      });

      it('should send query params under custom trait if set', function() {
        amplitude.options.mapQueryParams = { ham: 'user_properties' };
        analytics.identify('id', { trait: true }, { page: { search: '?foo=bar' } });
        analytics.called(window.amplitude.setUserId, 'id');
        analytics.called(window.amplitude.setUserProperties, { id: 'id', trait: true, ham: '?foo=bar' });
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window.amplitude, 'logEvent');
        analytics.stub(window.amplitude, 'setUserProperties');
        analytics.stub(window.amplitude, 'logRevenue');
        analytics.stub(window.amplitude, 'logRevenueV2');
      });

      it('should send an event', function() {
        analytics.track('event');
        analytics.called(window.amplitude.logEvent, 'event');
        analytics.didNotCall(window.amplitude.logRevenue);
        analytics.didNotCall(window.amplitude.logRevenueV2);
      });

      it('should send an event and properties', function() {
        analytics.track('event', { property: true });
        analytics.called(window.amplitude.logEvent, 'event', { property: true });
        analytics.didNotCall(window.amplitude.logRevenue);
        analytics.didNotCall(window.amplitude.logRevenueV2);
      });

      it('should also add $revenue if properties.revenue exists', function() {
        analytics.track('event', { revenue: 17.38 });
        analytics.called(window.amplitude.logEvent, 'event', { revenue: 17.38, $revenue: 17.38 });
      });

      // FIXME: revisit this behavior later because it does not comply very well with our ecommerce spec
      it('should also add $productId if productId if properties.productId exists', function() {
        analytics.track('event', { product_id: 'yolo123' });
        analytics.called(window.amplitude.logEvent, 'event', { product_id: 'yolo123', $productId: 'yolo123' });
      });

      it('should also add $revenueType if properties.revenueType exists', function() {
        analytics.track('event', { revenueType: 'refund' });
        analytics.called(window.amplitude.logEvent, 'event', { revenueType: 'refund', $revenueType: 'refund' });
      });

      it('should send a query params under custom prop as user properties', function() {
        amplitude.options.mapQueryParams = { ham: 'user_properties' };
        analytics.track('event', { foo: 'bar' }, { page: { search: '?foo=bar' } });
        analytics.called(window.amplitude.setUserProperties, { ham: '?foo=bar' });
      });

      it('should send a query params under custom prop as user or event properties', function() {
        amplitude.options.mapQueryParams = { ham: 'event_properties' };
        analytics.track('event', { foo: 'bar' }, { page: { search: '?foo=bar' } });
        analytics.called(window.amplitude.logEvent, 'event', { foo: 'bar', ham: '?foo=bar' });
      });
    });

    describe('#group', function() {
      beforeEach(function() {
        analytics.stub(window.amplitude, 'setGroup');
      });

      it('should call setGroup', function() {
        analytics.group('testGroupId');
        analytics.called(window.amplitude.setGroup, '[Segment] Group', 'testGroupId');
      });
    });
  });
});
