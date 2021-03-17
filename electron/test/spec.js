const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
// const electronPath = require('electron');

describe('Start GUI', function () {
  this.timeout(10000);

  beforeEach( () => {
    this.app = new Application({
        path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron' + (process.platform === 'win32' ? '.cmd' : '')),
        args: [path.join(__dirname, '..')],
        chromeDriverLogPath: 'chromedriverlog.log',
        chromeDriverArgs: ['remote-debugging-port=9222']
    })
    return this.app.start();
  })

  afterEach(() => {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
  });

  it('should work', function () {
    return assert.ok(true);
  });

  it('open window', function () {
    if(this.app){
      return this.app.client.waitUntilWindowLoaded().getWindowCount().should.eventually.equal(1);
    }
    return false;
 });
  
});

