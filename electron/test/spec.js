const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
// const electronPath = require('electron');

const app = new Application({
  path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron' + (process.platform === 'win32' ? '.cmd' : '')),
  args: [path.join(__dirname, '..')],
  chromeDriverLogPath: 'chromedriverlog.log',
  chromeDriverArgs: ['remote-debugging-port=9222']
})

describe('Start GUI', function () {
  this.timeout(10000);

  beforeEach(async () => {
    // this.app = 
    await app.start();
    return app.isRunning();
  })

  afterEach(() => {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });

  it('should work', function () {
    return assert.ok(true);
  });

  it("wait until window loaded", () => {
    return app.client.waitUntilWindowLoaded();
  });

  it('open window', async () => {
    const count = await app.client.getWindowCount(); //.should.eventually.equal(1);
    return assert.strictEqual(count, 1);
  });

   it('displays a title', async () => {
    await app.client.waitUntilWindowLoaded()
    const title = await app.client.getTitle();
    return assert.strictEqual(title, 'T2WML - Projects');
  });

  it('has a button with the text "New project"', async () => {
    const expectedText = 'New project';

    const appSelect = await app.client.react$('App');//.react$('ProjectList');
    const projlistSelect = await appSelect.react$('ProjectList');
    const btnText = await projlistSelect.$('#btn-new-project').then((btn) => btn.getText());
    return assert.strictEqual(btnText, expectedText);
  });


});

