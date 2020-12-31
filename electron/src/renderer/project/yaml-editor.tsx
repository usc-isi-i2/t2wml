import React, { Component, Fragment } from 'react';

// YAML
import MonacoEditor from 'react-monaco-editor';
import yaml from 'js-yaml';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage, t2wmlColors } from '../common/general';
import RequestService, { IStateWithError } from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react"
import wikiStore, { LayerState } from '../data/store';
import { defaultYamlContent } from "./default-values";
import { IReactionDisposer, reaction } from 'mobx';
// import SheetSelector from './sheet-selector/sheet-selector';
import { ProjectDTO } from '../common/dtos';
import { saveFiles } from './save-files';


interface yamlProperties {
  isShowing: boolean;
}

interface yamlState extends IStateWithError {
  yamlJson: JSON | null;
  isValidYaml: boolean;
  yamlParseErrMsg: string | null;
  yamlParseErrFloatMessage: string;
  isYamlContentChanged: boolean;
  isImportFile: boolean;
  disableYaml: boolean;
  isAddedYaml: boolean;
}


@observer
class YamlEditor extends Component<yamlProperties, yamlState> {
  private requestService: RequestService;

  monacoRef: any = React.createRef();
  private disposeReaction?: IReactionDisposer;

  constructor(props: yamlProperties) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {
      // yaml
      yamlJson: null,
      isValidYaml: true,
      yamlParseErrMsg: "",
      yamlParseErrFloatMessage: "",
      errorMessage: {} as ErrorMessage,
      isYamlContentChanged: false,
      isImportFile: false,
      disableYaml: false,
      isAddedYaml: false,
    };

    // init functions
    this.handleOpenYamlFile = this.handleOpenYamlFile.bind(this);
    // this.handleChangeFile = this.handleChangeFile.bind(this);
  }

  componentDidMount() {
    if (!wikiStore.projects.projectDTO || !saveFiles.currentState.dataFile) {
      this.setState({disableYaml: true});
    }
    this.disposeReaction = reaction(() => wikiStore.yaml.yamlContent, (newYamlContent) => this.updateYamlContent(newYamlContent));
    this.disposeReaction = reaction(() => wikiStore.yaml.yamlError, () => this.updateErrorFromStore());
    // this.disposeReaction = reaction(() => wikiStore.projects.projectDTO, (project) => { if (project) { this.updateYamlFiles(project); }});
  }

  componentWillUnmount() {
    if (this.disposeReaction) {
      this.disposeReaction();
    }
  }

  async handleApplyYaml() {
    console.log("<YamlEditor> clicked apply");

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    // send request
    console.log("<YamlEditor> -> %c/upload_yaml%c for yaml regions", LOG.link, LOG.default);
    const data = {"yaml": wikiStore.yaml.yamlContent,
                  "title": wikiStore.yaml.yamlName as string,
                  "sheetName": saveFiles.currentState.sheetName};

    try {
      await this.requestService.call(this, () => this.requestService.uploadYaml(data));
      console.debug('Uploading yaml ', wikiStore.yaml.yamlContent);
      console.log("<YamlEditor> <- %c/upload_yaml%c with:", LOG.link, LOG.default);

      // follow-ups (success)
      wikiStore.output.isDownloadDisabled = false;


    } catch(error) {
      console.log(error);
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
      wikiStore.table.isCellSelectable = true;
    }

  }

  handleEditYaml() {
    wikiStore.table.isCellSelectable = false;

    const yamlContent = (this.monacoRef.current as any).editor.getModel().getValue();
    wikiStore.yaml.yamlContent = yamlContent;
    wikiStore.yaml.yamlhasChanged = true;
    // this.setState({ isYamlContentChanged: true });
    try {
      const yamlJson = (yaml.safeLoad(yamlContent) as JSON);
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        yamlParseErrMsg: null,
        yamlParseErrFloatMessage: '',
      });
    } catch (error) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        yamlParseErrMsg: "⚠️ " + error.message.match(/[^:]*(?=:)/)[0],
        yamlParseErrFloatMessage: error.stack,
      });
    }
    if (yamlContent === defaultYamlContent) {
      this.setState({ yamlParseErrMsg: '' });
    }
  }

  handleOpenYamlFile(event: any) {
    // get file
    const file = (event.target as any).files[0];
    if (!file) return;
    let yamlName = file.name;
    if (file.path.startsWith(wikiStore.projects.current!.folder)) {
      yamlName = file.path.split(wikiStore.projects.current!.folder)[1].substring(1);
    }
    console.log("<YamlEditor> opened file: " + yamlName);
    wikiStore.yaml.yamlName = yamlName;
    // wikiStore.yaml.yamlList = [...wikiStore.yaml.yamlList, yamlName];

    wikiStore.table.isCellSelectable = false;

    // upload local yaml
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (async() => {
      const yamlContent = reader.result as string;
      wikiStore.yaml.yamlContent = yamlContent;
      wikiStore.yaml.yamlName = yamlName;
      wikiStore.yaml.yamlhasChanged = true;
      try {
        const yamlJson = (yaml.safeLoad((yamlContent as string))) as JSON;
        this.setState({
          yamlJson: yamlJson,
          isValidYaml: true,
          yamlParseErrMsg: null,
          yamlParseErrFloatMessage: '',
          isImportFile: true
        });

        // Save yaml when importing yaml
        await wikiStore.yaml.saveYaml();
      } catch (error) {
        this.setState({
          yamlJson: null,
          isValidYaml: false,
          yamlParseErrMsg: "⚠️ " + error.message.match(/[^:]*(?=:)/)[0],
          yamlParseErrFloatMessage: error.stack
        });
      }
      if (yamlContent === defaultYamlContent) {
        this.setState({ yamlParseErrMsg: '' });
      }
    });
  }

  updateYamlContent(yamlContent: string | undefined) {
    if (yamlContent == undefined) {
      yamlContent = defaultYamlContent;
    }
    const newYamlContent = yamlContent;
    wikiStore.yaml.yamlContent = newYamlContent;
    try {
      const yamlJson = (yaml.safeLoad(newYamlContent)) as JSON;
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        yamlParseErrMsg: null,
        yamlParseErrFloatMessage: ''
      });
    } catch (error) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        yamlParseErrMsg: "⚠️ " + error.message.match(/[^:]*(?=:)/)[0],
        yamlParseErrFloatMessage: error.stack
      });
    }
    if (yamlContent === defaultYamlContent) {
      this.setState({ yamlParseErrMsg: '' });
    }
  }

  updateErrorFromStore(){
    const yamlError = wikiStore.yaml.yamlError;
    if (yamlError && yamlError!="") {
      console.log("Errors while applying yaml:")
      console.log(yamlError);
      console.log(wikiStore.layers.error);
      if (wikiStore.yaml.yamlContent !== defaultYamlContent) {
        this.setState({
          yamlParseErrMsg: "⚠️ " + yamlError
        });
      }
    }
  }

  // updateYamlFiles(project: ProjectDTO) {
  //   if (wikiStore.projects.projectDTO && saveFiles.currentState.dataFile) {
  //     this.setState({disableYaml: false});
  //   }

  //   const dataFile = saveFiles.currentState.dataFile;
  //   const sheetName = saveFiles.currentState.sheetName;
  //   if (dataFile) {
  //     if (project!.yaml_sheet_associations[dataFile] && project!.yaml_sheet_associations[dataFile][sheetName]) {
  //       debugger
  //       wikiStore.yaml.yamlList = project!.yaml_sheet_associations[dataFile][sheetName].val_arr;
  //       wikiStore.yaml.yamlName = project!.yaml_sheet_associations[dataFile][sheetName].selected;
  //     } else {
  //       // this.setState({isAddedYaml: true});
  //       let yamlToCurrentSheet = saveFiles.currentState.sheetName;
  //       if (yamlToCurrentSheet.endsWith('.csv')) {
  //         yamlToCurrentSheet = yamlToCurrentSheet.split('.csv')[0];
  //       } 
  //       if (!yamlToCurrentSheet.endsWith('.yaml')) {
  //         yamlToCurrentSheet += '.yaml';
  //       }

  //       wikiStore.yaml.yamlName = yamlToCurrentSheet;
  //       wikiStore.yaml.yamlList = [yamlToCurrentSheet];
  //     }
  //   } else {
  //     wikiStore.yaml.yamlName = '';
  //     wikiStore.yaml.yamlList = [];
  //   }
  // }

  // async handleChangeFile(event: any) {
  //   const yaml = event.target.innerHTML;
    
  //   // save prev yaml
  //   await wikiStore.yaml.saveYaml();

  //   wikiStore.yaml.yamlName = yaml;

  //   wikiStore.output.isDownloadDisabled = true;

  //   // before sending request
  //   wikiStore.table.showSpinner = true;
  //   wikiStore.wikifier.showSpinner = true;
  //   wikiStore.yaml.showSpinner = true;

  //   // send request
  //   try {
  //     saveFiles.changeYaml(yaml);
  //     // await this.requestService.call(this, () => this.requestService.changeYaml(wikiStore.projects.current!.folder, yaml));

  //     if (wikiStore.yaml.yamlContent) {
  //       wikiStore.table.isCellSelectable = true;
  //       wikiStore.output.isDownloadDisabled = false;
  //     } else {
  //       wikiStore.table.isCellSelectable = false;
  //     }
  //   } catch(error) {
  //     console.log(error);
  //   } finally {
  //     wikiStore.table.showSpinner = false;
  //     wikiStore.wikifier.showSpinner = false;
  //     wikiStore.yaml.showSpinner = false;
  //   }
  // }
  //
  // We have to add it to the file tree
  // async renameYaml(val: string, index: number) {
  //  // before sending request
  //   wikiStore.table.showSpinner = true;
  //   wikiStore.yaml.showSpinner = true;
  //   const oldName = wikiStore.yaml.yamlList[index];

  //   // Check if this yaml file exist, if not- save it before.
  //   if (!wikiStore.projects.projectDTO?.yaml_files.includes(oldName)) {
  //     await wikiStore.yaml.saveYaml();
  //   }

  //   // send request
  //   const data = {"old_name": oldName,
  //                 "new_name": val };

  //   try {
  //     await this.requestService.call(this, () => this.requestService.renameYaml(wikiStore.projects.current!.folder, data));
  //     // update yaml files according to received project.
  //     wikiStore.yaml.yamlList = wikiStore.projects.projectDTO!.yaml_files;
  //   } catch(error) {
  //     console.error("Rename yaml failed.", error);
  //   } finally {
  //     wikiStore.table.showSpinner = false;
  //     wikiStore.yaml.showSpinner = false;
  //   }
  // }
  // 
  // async addYaml() {
  //   await wikiStore.yaml.saveYaml();

  //   this.setState({
  //     isAddedYaml: true,
  //   });
  //   let i = 1;
  //   let sheetName = saveFiles.currentState.sheetName;
  //   // remove .csv from sheet name
  //   if (sheetName.endsWith('.csv')) {
  //     sheetName = sheetName.split('.csv')[0];
  //   }
  //   let yamlName = sheetName + "-" + i + ".yaml";  
  //   while (wikiStore.projects.projectDTO!.yaml_files.includes(yamlName)) {
  //     i++;
  //     yamlName = sheetName + "-" + i + ".yaml"; 
  //   }
    
  //   wikiStore.yaml.yamlContent = defaultYamlContent;
  //   wikiStore.yaml.yamlName = yamlName;
  //   wikiStore.yaml.yamlList.push(yamlName);

  //   wikiStore.layers = new LayerState();
  // }

  render() {
    const yamlContent = wikiStore.yaml.yamlContent;

    // render upload tooltip
    const uploadToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="upload">
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • YAML Ain&apos;t Markup Language (.yaml)
        </div>
      </Tooltip>
    );

    return (
      <Fragment>
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
        <Card
          className="w-100 shadow-sm"
          style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
        >

          {/* header */}
          <Card.Header
            style={{ height: "40px", padding: "0.5rem 1rem", background: t2wmlColors.YAML }}
            onClick={() => wikiStore.editors.nowShowing = "YamlEditor"}
          >

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 75px)", cursor: "default" }}
            >
              YAML&nbsp;Editor&nbsp;({saveFiles.currentState.mappingFile})
            </div>

            {/* button of open yaml file */}
            <OverlayTrigger overlay={uploadToolTipHtml} placement="bottom" trigger={["hover", "focus"]}>
              <Button
                className="d-inline-block float-right"
                variant="outline-light"
                size="sm"
                style={{ padding: "0rem 0.5rem" }}
                onClick={() => { document.getElementById("file_yaml")?.click(); }}
              >
                Import
                </Button>
            </OverlayTrigger>

            {/* hidden input of yaml file */}
            <input
              type="file"
              id="file_yaml"
              accept=".yaml"
              style={{ display: "none" }}
              disabled={this.state.disableYaml || wikiStore.yaml.showSpinner}
              onChange={this.handleOpenYamlFile}
              onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />

          </Card.Header>

          {/* loading spinner */}
          <div className="mySpinner" hidden={!wikiStore.yaml.showSpinner}>
              <Spinner animation="border" />
          </div>

          {/* yaml editor */}
          <Card.Body
            className="w-100 h-100 p-0"
            style={(this.props.isShowing) ? { overflow: "hidden" } : { display: "none" }}
          >
            { ! this.state.disableYaml ?
            <MonacoEditor ref={this.monacoRef}
              width="100%"
              height="100%"
              language="yaml"
              theme="vs"
              value={yamlContent}
              options={{
                // All options for construction of monaco editor:
                // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ieditorconstructionoptions.html
                automaticLayout: false,
                lineNumbersMinChars: 4,
                // minimap: { enabled: false, },
                // mouseWheelZoom: true,
                renderLineHighlight: "all", // "none" | "gutter" | "line" | "all"
                renderWhitespace: "all", // "none" | "boundary" | "all"
                scrollbar: {
                  horizontalScrollbarSize: 10,
                  horizontalSliderSize: 6,
                  verticalScrollbarSize: 10,
                  verticalSliderSize: 6
                },
                showFoldingControls: 'always',
              }}
              onChange={() => this.handleEditYaml()}
              editorDidMount={(editor) => {
                editor.getModel()?.updateOptions({ tabSize: 2 });
                setInterval(() => { editor.layout(); }, 200);  // automaticLayout above misses trigger opening, so we've replaced it
                // This is better done by catching the trigger event and calling editor.layout there,
                // once we figure out how to catch the trigger event.
              }}
            /> : null }
          </Card.Body>

          {/* card footer */}
          <Card.Footer
            style={
              (this.props.isShowing) ? { background: "whitesmoke" } : { display: "none" }
            }
          >

            {/* error message */}
            <div
              className="d-inline-block text-truncate"
              style={{
                // fontFamily: "Menlo, Monaco, \"Courier New\", monospace",
                fontSize: "14px",
                color: t2wmlColors.OUTPUT,
                width: "calc(100% - 10px)",
                cursor: "help"
              }}
              title={this.state.yamlParseErrFloatMessage}
            >
              {this.state.yamlParseErrMsg}
            </div>

            {/* apply button */}
            <Button
              className="d-inline-block float-right"
              size="sm"
              style={{ borderColor: t2wmlColors.YAML, background: t2wmlColors.YAML, padding: "0rem 0.5rem" }}
              onClick={() => this.handleApplyYaml()}
              disabled={!this.state.isValidYaml || this.state.disableYaml || wikiStore.yaml.showSpinner}
            >
              Apply
            </Button>
            
            {/* <div
              id="yamlSelector" // apply custom scroll bar
              style={{
                height: "55px",
                padding: "0.5rem 0.75rem",
                background: "whitesmoke",
                // overflow: "scroll hidden", // safari does not support this
                overflowX: "scroll",
                overflowY: "hidden",
                whiteSpace: "nowrap"
              }}
            > */}
              {/* <SheetSelector
                sheetNames={wikiStore.yaml.yamlList}
                currSheetName={wikiStore.yaml.yamlName}
                itemType="file"
                handleSelectSheet={(event) => this.handleChangeFile(event)}
                handleAddItem={() => this.addYaml()}
                disableAdd={wikiStore.yaml.yamlContent === defaultYamlContent}
                handleDoubleClickItem={(val, index) => this.renameYaml(val, index)}
              /> */}
            {/* </div> */}
          </Card.Footer>
        </Card>
      </Fragment>
    );
  }
}

export default YamlEditor;
