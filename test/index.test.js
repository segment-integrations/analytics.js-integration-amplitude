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
    eventUploadPeriodMillis: 30000
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
      .option('eventUploadPeriodMillis', 30000));
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
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window.amplitude, 'logEvent');
        analytics.stub(window.amplitude, 'logRevenue');
      });

      it('should send an event', function() {
        analytics.track('event');
        analytics.called(window.amplitude.logEvent, 'event');
        analytics.didNotCall(window.amplitude.logRevenue);
      });

      it('should send an event and properties', function() {
        analytics.track('event', { property: true });
        analytics.called(window.amplitude.logEvent, 'event', { property: true });
        analytics.didNotCall(window.amplitude.logRevenue);
      });

      it('should send a revenue event', function() {
        analytics.track('event', { revenue: 19.99 });
        analytics.called(window.amplitude.logRevenue, 19.99, undefined, undefined);
      });

      it('should send a revenue event with quantity and productId', function() {
        analytics.track('event', { revenue: 19.99, quantity: 2, productId: 'AMP1' });
        analytics.called(window.amplitude.logRevenue, 19.99, 2, 'AMP1');
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
