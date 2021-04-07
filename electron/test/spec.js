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
  args: [path.join(__dirname, "..\\dist"), path.join(__dirname, "..\\test\\files\\frontend-test-project")], 
  chromeDriverLogPath: 'chromedriverlog.log',
  chromeDriverArgs: ['remote-debugging-port=9222']
})


describe('Start GUI', function () {
  // return;
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

  it('Has a button with the text "New project"', async () => {
    const expectedText = 'New project';
    const appSelect = await app.client.react$('App');
    await appSelect.waitForExist({timeout: 5000});
    const projlistSelect = await appSelect.react$('ProjectList');
    const btnText = await projlistSelect.$('#btn-new-project').then((btn) => btn.getText());
    return assert.strictEqual(btnText, expectedText);
  });

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

describe('Open with project:', function () {
  // return;
  this.timeout(20000);

  beforeEach( async () =>  {
    await appProject.start();
    return appProject.isRunning();
  })

  afterEach(() => {
    if (appProject && appProject.isRunning()) {
      return appProject.stop();
    }
  });

  it('open window', async () => {
    const count = await appProject.client.getWindowCount();
    return assert.strictEqual(count, 1);
  });

  it('switch between data files from the sidebar', async () => {
    const appSelect = await appProject.client.react$('App');
    await appSelect.waitForExist({timeout: 5000});
    const projectComponent = await appSelect.react$('Project');
    await projectComponent.waitForExist();
    assert.strictEqual(projectComponent.error, undefined);
    const sidebarComponent = await projectComponent.react$('Sidebar');
    await sidebarComponent.waitForExist({ timeout: 5000 });
    const fileTreeComponentListElement = await sidebarComponent.react$$('FileTree');
    const fileTreeComponent = fileTreeComponentListElement[1];

    const fileNodeList = await fileTreeComponent.react$$('FileNode');
    // console.log(await fileNodeList[0].getHTML());
    await fileNodeList[0].click()
    await appProject.client.pause(2000);
    const fileNodeSubList0 = await fileNodeList[0].react$$('FileNode');
    
    const canonicalSpan = await fileNodeSubList0[0].$('span');
    assert.strictEqual(await canonicalSpan.getText(), "canonical");
    await canonicalSpan.click();

    const yearRowSpan = await fileNodeSubList0[2].$('span');
    assert.strictEqual(await yearRowSpan.getText(), "year-row");
    await yearRowSpan.click();
  });

  it('switch between sheets from the sidebar', async () => {
    const appSelect = await appProject.client.react$('App');
    await appSelect.waitForExist({timeout: 5000});
    const projectComponent = await appSelect.react$('Project');
    await projectComponent.waitForExist();
    assert.strictEqual(projectComponent.error, undefined);
    const sidebarComponent = await projectComponent.react$('Sidebar');
    await sidebarComponent.waitForExist({ timeout: 5000 });
    const fileTreeComponentListElement = await sidebarComponent.react$$('FileTree');
    const fileTreeComponent = fileTreeComponentListElement[1];

    const fileNodeList = await fileTreeComponent.react$$('FileNode');
    // console.log(await fileNodeList[2].getHTML());
    await fileNodeList[2].click()
    await appProject.client.pause(2000);

    const tableContainerComponet = await projectComponent.react$('TableContainer');
    const titleText = await tableContainerComponet.$('#table-container-title').then((t) => t.getText());
    const expectedText = "homicide_report_total_and_sex.xlsx[Read-Only]";
    return assert.strictEqual(titleText, expectedText);
  });

  it('switch between mapping files', async () => {
    const appSelect = await appProject.client.react$('App');
    await appSelect.waitForExist({timeout: 5000});
    const projectComponent = await appSelect.react$('Project');
    await projectComponent.waitForExist();
    assert.strictEqual(projectComponent.error, undefined);
    const sidebarComponent = await projectComponent.react$('Sidebar');
    await sidebarComponent.waitForExist({ timeout: 5000 });

    const fileTreeComponentListElement = await sidebarComponent.react$$('FileTree');
    const fileTreeComponent = fileTreeComponentListElement[1];

    const fileNodeList = await fileTreeComponent.react$$('FileNode');
    // console.log(await fileNodeList[0].getHTML());
    const fileNodeHomicide = fileNodeList[2];
    await fileNodeHomicide.click()
    // await appProject.client.pause(2000);
    const fileNodeHomicideChildren = await fileNodeHomicide.react$$('FileNode');
    
    const table1aNode = fileNodeHomicideChildren[0]
    await table1aNode.waitForExist({ timeout: 5000 });
    // const table1aNodeChildren = await table1aNode.react$$('FileNode');
    // assert.strictEqual(table1aNodeChildren.length, 2)

    const table1aNodeSpanList = await table1aNode.$$('span'); 
    assert.strictEqual(await table1aNodeSpanList[0].getText(), "table-1a");
    await table1aNodeSpanList[1].click(); // annotations...
    assert.strictEqual(table1aNodeSpanList.length, 3);
    await appProject.client.pause(1000);
    await table1aNodeSpanList[2].click(); // table-1a.yaml
    await appProject.client.pause(1000);
    return assert.strictEqual(await table1aNodeSpanList[2].getText(), "table-1a.yaml");
  });

  it('switch between files from sheet switcher below spreadsheet', async () => {
    const appSelect = await appProject.client.react$('App');
    await appSelect.waitForExist({timeout: 5000});
    const projectComponent = await appSelect.react$('Project');
    await projectComponent.waitForExist();
    assert.strictEqual(projectComponent.error, undefined);

    const tableContainerComponet = await projectComponent.react$('TableContainer');
    const sheetSelectorComponent = await tableContainerComponet.react$('SheetSelector');
    await sheetSelectorComponent.waitForExist({timeout: 5000});
    const buttonSheetSelctorList = await sheetSelectorComponent.$$('button');
    // console.log(buttonSheetSelctorList.length);
    assert.strictEqual(buttonSheetSelctorList.length, 22);
    for (let index = 0; index < 3; index++) {
      await buttonSheetSelctorList[index].click();
      // console.log(await buttonSheetSelctorList[index].getText())
    }
    return;
  });

  it('switch between modes (annotation, wikify, output).', async () => {
    const appSelect = await appProject.client.react$('App');
    await appSelect.waitForExist({timeout: 5000});
    const projectComponent = await appSelect.react$('Project');
    await projectComponent.waitForExist();
    assert.strictEqual(projectComponent.error, undefined);

    const tableContainerComponet = await projectComponent.react$('TableContainer');
    const modeBtnGroup = await tableContainerComponet.$('#table-mode-btn-group');
    // console.log(modeBtnGroup);
    const buttonModeList = await modeBtnGroup.$$('button');
    assert.strictEqual(await buttonModeList.length, 3);

    const tableMode = ["AnnotationTable", "WikifyTable", "OutputTable"]
    const btnText = ['Annotate', "Wikify", "Output"];

    for (let index = 0; index < buttonModeList.length; index++) {
      await buttonModeList[index].click();
      await appProject.client.pause(2000);
      const tableComponent = await tableContainerComponet.react$(tableMode[index]);
      assert.strictEqual(tableComponent.error, undefined);
      assert.strictEqual(await buttonModeList[index].getText(), btnText[index]);
    }
    return;
  });

});

describe('test try:', function () {
  //return;
  this.timeout(20000);

  beforeEach( () => {
    return appProject.start();
  })

  afterEach(() => {
    if (appProject && appProject.isRunning()) {
      return appProject.stop();
    }
  });
});
