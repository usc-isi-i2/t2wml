const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
// const electronPath = require('electron');

const app = new Application({
  path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron' + (process.platform === 'win32' ? '.cmd' : '')),
  args: [path.join(__dirname, "..\\dist")  ],//  , path.join(__dirname, '..\\..', "Datasets\\homicide")], 
  chromeDriverLogPath: 'chromedriverlog.log',
  chromeDriverArgs: ['remote-debugging-port=9222']
})

const appProject = new Application({
  path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron' + (process.platform === 'win32' ? '.cmd' : '')),
  args: [path.join(__dirname, "..\\dist"), path.join(__dirname, '..\\..', "Datasets\\homicide")], 
  chromeDriverLogPath: 'chromedriverlog.log',
  chromeDriverArgs: ['remote-debugging-port=9222']
})


describe('Start GUI', function () {
  this.timeout(10000);

  beforeEach( () => {
    return app.start();
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

  // it('New project', async () => {
  //   const expectedText = 'New project';
  //   const appSelect = await app.client.react$('App');//.react$('ProjectList');
  //   const projlistSelect = await appSelect.react$('ProjectList');
  //   const btnText = await projlistSelect.$('#btn-new-project').then((btn) => btn.getText());
  //   return assert.strictEqual(btnText, expectedText);
  // });

  // it("create a project", async () => {
  //   // const appSelect = await app.client.react$('App');
  //   // const projlistSelect = await appSelect.react$('ProjectList');
  //   // const btnNewProject = await projlistSelect.$('#btn-new-project');
  //   // await btnNewProject.click()

  //   // const btnOpenProject = await projlistSelect.$('#btn-open-project');
  //   // await btnOpenProject.click();
  //   await app.client.pause(5000);
  //   // await appSelect.saveScreenshot("./test/screenshot3.png");
  //   // const filePath = './test/files/project-example/project.t2wml';
  //   // const remoteFilePath = await app.client.uploadFile(filePath);
    
  //   // app.client.$('#file-upload').setValue(remoteFilePath)
  //   // app.client.$('#file-submit').click()
  //   // await app.client.pause(3000);
  //   // await appSelect.saveScreenshot("./test/screenshot.png");

  //   // await app.client.pause(1000);
  //   // assert.strictEqual(await app.client.getWindowCount(), 1);
  //   // const createProjectModal = await app.client.react$('CreateProject');
  //   // console.log(createProjectModal);

  //   // app.client.auditAccessibility().then(function (audit) {
  //   //   if (audit.failed) {
  //   //     console.error(audit.message)
  //   //   }
  //   //   console.log("no error:")
  //   //   console.log(audit)
  //   // })
  //   // console.log(await createProjectModal.querySelector('Button'));
  //   // const label = await createProjectModal.$('.modal-body');
  //   // const html = await createProjectModal.getHTML();//.$('#create-project-modal');
  //   // console.log(html);
  //   // app.browserWindow.isVisible().then(function (visible) {
  //   //   console.log('window is visible? ' + visible)
  //   // })
  //   // app.browserWindow.capturePage().then(function (imageBuffer) {
  //   //   fs.writeFile('./test/page.png', imageBuffer)
  //   // })
  //   // app.webContents.isLoading().then(function (visible) {
  //   //   console.log('window is loading? ' + visible)
  //   // })
  //   // app.webContents.savePage('./test/page.html', 'HTMLComplete')
  //   // .then(function () {
  //   //   console.log('page saved')
  //   // }).catch(function (error) {
  //   //   console.error('saving page failed', error.message)
  //   // })
  //   // app.mainProcess.argv().then(function (argv) {
  //   //   console.log('main process args: ' + argv)
  //   // })

  //   // create-project-modal
    
  //   // let modalExist = await createProjectModal.waitForExist('#btn-choose-folder-project', 1000*3);
  //   // console.log(modalExist);
  //   // await createProjectModal.saveScreenshot("./test/screenshot.png")
  //   // console.log(await createProjectModal.isDisplayedInViewport())
  //   // await app.client.pause(3000);
  //   // await app.client.waitUntilWindowLoaded(3000);
  //   // const btnChooseFolder = await createProjectModal.$("css selector", '#btn-choose-folder-project');
  //   // const btnChooseFolder = await createProjectModal.findElement("css selector", '#btn-choose-folder-project');
  //   // console.log(btnChooseFolder);

  //   // const btnChooseFolder = await createProjectModal.$('*');
  //   // // const btnChooseFolder1 = await btnChooseFolder.react$('Modal.header');
  //   // console.log(btnChooseFolder);

  //   // createProjectModal.getText('#btn-choose-folder-project').then(function (errorText) {
  //   //   console.log('The #error-alert text content is ' + errorText)
  //   // })
  //   // const clickResult = await app.client.elementClick(Object.keys(btnChooseFolder)[0]); //"element-6066-11e4-a52e-4f735466cecf"
  //   // console.log(clickResult);
  //   // const clickResult2 = await app.client.elementClick('#btn-choose-folder-project');
  //   // console.log(clickResult2);
  //   // await btnChooseFolder.click();
  
  //   // await app.client.getElementValue
  //   // await app.client.pause(2000);
  //   // await app.click("#btn-choose-folder-project");
  //   // await createProjectModal.saveScreenshot("./test/screenshot2.png")


  //   // const modalElement = await createProjectModal.$('#btn-choose-folder-project');
  //   // console.log(modalElement);

  //   // console.log(await modalElement.isExisting());
  //   // // const titleControl = await createProjectModal.$('#new-project-control-title');
  //   // // console.log(titleControl);
  //   // // assert.strictEqual(await modalElement.error,undefined);
  //   // return true;
  // });

});

describe('open a project', function () {
  this.timeout(10000);

  beforeEach( () => {
    return appProject.start();
  })

  afterEach(() => {
    if (appProject && appProject.isRunning()) {
      return appProject.stop();
    }
  });

  it('open window', async () => {
    const count = await appProject.client.getWindowCount(); //.should.eventually.equal(1);
    return assert.strictEqual(count, 1);
  });

});

