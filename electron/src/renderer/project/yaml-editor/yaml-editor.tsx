import React, { Component, Fragment } from 'react';
import * as path from 'path';
// YAML
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import MonacoEditor from 'react-monaco-editor';
import yaml from 'js-yaml';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage, t2wmlColors } from '../../common/general';
import RequestService, { IStateWithError } from '../../common/service';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react"
import wikiStore from '../../data/store';
import { defaultYamlContent } from "../default-values";
import { IReactionDisposer, reaction } from 'mobx';
import { currentFilesService } from '../../common/current-file-service';
import { remote } from 'electron';

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
  }

  componentDidMount() {
    if (!wikiStore.project.projectDTO || !currentFilesService.currentState.dataFile) {
      this.setState({ disableYaml: true });
    }
    this.disposeReaction = reaction(() => wikiStore.yaml.yamlContent, (newYamlContent) => this.updateYamlContent(newYamlContent));
    this.disposeReaction = reaction(() => wikiStore.yaml.yamlError, () => this.updateErrorFromStore());
    this.disposeReaction = reaction(() => wikiStore.table.table, () => { this.updateDisableYaml() });

    // init functions
    this.handleOpenYamlFile = this.handleOpenYamlFile.bind(this);
  }

  componentWillUnmount() {
    if (this.disposeReaction) {
      this.disposeReaction();
    }
  }

  updateDisableYaml() {
    if (wikiStore.table.table.cells) {
      this.setState({ disableYaml: false });
    } else {
      this.setState({ disableYaml: true });
    }
  }

  async createYaml() {
    const result = await remote.dialog.showSaveDialog({
      title: "Create Yaml File",
      defaultPath: path.join(wikiStore.project.projectDTO!.directory, currentFilesService.currentState.sheetName+".yaml"),
      properties: ['createDirectory'],
      filters: [
        { name: "Yaml", extensions: ["yaml"] }
      ],
    });
    if (!result.canceled && result.filePath) {
      try {
        // send request
        console.log("<YamlEditor> -> %c/upload_yaml%c for yaml regions", LOG.link, LOG.default);
        const data = {
          "yaml": wikiStore.yaml.yamlContent,
          "title": result.filePath,
          "dataFile": currentFilesService.currentState.dataFile,
          "sheetName": currentFilesService.currentState.sheetName
        };

        const yamlFile = await this.requestService.call(this, () => this.requestService.saveYaml(data));
        // follow-ups (success)
        wikiStore.output.isDownloadDisabled = false;
        currentFilesService.changeYaml(yamlFile, currentFilesService.currentState.sheetName, currentFilesService.currentState.dataFile)

      } catch (error) {
        console.log(error);
      }

    }
  }

  async handleApplyYaml() {
    console.log("<YamlEditor> clicked apply");

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    // send request
    console.log("<YamlEditor> -> %c/upload_yaml%c for yaml regions", LOG.link, LOG.default);
    const data = {
      "yaml": wikiStore.yaml.yamlContent,
      "title": currentFilesService.currentState.mappingFile,
      "sheetName": currentFilesService.currentState.sheetName
    };

    try {
      await this.requestService.call(this, () => this.requestService.uploadYaml(data));
      console.debug('Uploading yaml ', wikiStore.yaml.yamlContent);
      console.log("<YamlEditor> <- %c/upload_yaml%c with:", LOG.link, LOG.default);

      // follow-ups (success)
      wikiStore.output.isDownloadDisabled = false;


    } catch (error) {
      console.log(error);
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

  }

  handleEditYaml() {

    const yamlContent = (this.monacoRef.current as any).editor.getModel().getValue();
    wikiStore.yaml.yamlContent = yamlContent;
    wikiStore.yaml.yamlhasChanged = true;
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

    currentFilesService.changeYamlInSameSheet(yamlName);

    // upload local yaml
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (async () => {
      const yamlContent = reader.result as string;
      wikiStore.yaml.yamlContent = yamlContent;
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

  updateErrorFromStore() {
    const yamlError = wikiStore.yaml.yamlError;
    if (yamlError && yamlError != "") {
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

  render() {
    const yamlContent = wikiStore.yaml.yamlContent;

    monacoEditor.editor.defineTheme('disabled-theme', {
      base: 'vs',
      inherit: true,
      rules: [{ background: 'CBCBCB' } as any],
      colors: {
        'editor.background': '#CBCBCB',
      },
    });

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
              YAML&nbsp;Editor&nbsp;({currentFilesService.currentState.mappingFile})
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
            {!this.state.disableYaml ?
              <MonacoEditor ref={this.monacoRef}
                width="100%"
                height="100%"
                language="yaml"
                theme={currentFilesService.currentState.mappingType !== 'Yaml' ? 'disabled-theme' : 'vs'}
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
                  readOnly: currentFilesService.currentState.mappingType !== 'Yaml',
                }}
                onChange={() => this.handleEditYaml()}
                editorDidMount={(editor) => {
                  editor.getModel()?.updateOptions({ tabSize: 2 });
                  setInterval(() => { editor.layout(); }, 200);  // automaticLayout above misses trigger opening, so we've replaced it
                  // This is better done by catching the trigger event and calling editor.layout there,
                  // once we figure out how to catch the trigger event.
                }}
              /> : null}
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
            {currentFilesService.currentState.mappingType === 'Yaml' ?
              <Button
                className="d-inline-block float-right"
                size="sm"
                style={{ borderColor: t2wmlColors.YAML, background: t2wmlColors.YAML, padding: "0rem 0.5rem" }}
                onClick={() => this.handleApplyYaml()}
                disabled={!this.state.isValidYaml || this.state.disableYaml || wikiStore.yaml.showSpinner}
              >
                Apply
              </Button> :
              <Button
                className="d-inline-block float-right"
                size="sm"
                style={{ borderColor: t2wmlColors.YAML, background: t2wmlColors.YAML, padding: "0rem 0.5rem" }}
                onClick={() => this.createYaml()}
                disabled={this.state.disableYaml}
              >
                Create Yaml
              </Button>
            }
          </Card.Footer>
        </Card>
      </Fragment>
    );
  }
}

export default YamlEditor;
