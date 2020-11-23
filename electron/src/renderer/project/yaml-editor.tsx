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
import wikiStore from '../data/store';
import { defaultYamlContent } from "./default-values";
import { IReactionDisposer, reaction } from 'mobx';
import SheetSelector from './table-viewer/sheet-selector';
import { ProjectDTO } from '../common/dtos';


interface yamlProperties {
  isShowing: boolean;
}

interface yamlState extends IStateWithError {
  yamlContent: string;
  yamlTitle: string;
  yamlJson: JSON | null;
  isValidYaml: boolean;
  yamlParseErrMsg: string | null;
  yamlParseErrFloatMessage: string;
  yamlNames: Array<string>;
  currentYaml: string;
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
      yamlContent: defaultYamlContent,
      yamlTitle: "",
      yamlJson: null,
      isValidYaml: true,
      yamlParseErrMsg: "",
      yamlParseErrFloatMessage: "",
      errorMessage: {} as ErrorMessage,
      yamlNames: [],
      currentYaml: '',
      isYamlContentChanged: false,
      isImportFile: false,
      disableYaml: false,
      isAddedYaml: false,
    };

    // init functions
    this.handleOpenYamlFile = this.handleOpenYamlFile.bind(this);
  }

  componentDidMount() {
    if (!wikiStore.projects.projectDTO || !wikiStore.projects.projectDTO._saved_state.current_data_file) {
      this.setState({disableYaml: true});
    }
    this.disposeReaction = reaction(() => wikiStore.yaml.yamlContent, (newYamlContent) => this.updateYamlContent(newYamlContent));
    this.disposeReaction = reaction(() => wikiStore.yaml.yamlError, () => this.updateErrorFromStore());
    this.disposeReaction = reaction(() => wikiStore.projects.projectDTO, (project) => { if (project) { this.updateYamlFiles(project); }});
    this.disposeReaction = reaction(() => wikiStore.yaml.haveToSaveYaml, async(flag) => { if (flag) { await this.saveYaml(); }});
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
    const formData = new FormData();
    formData.append("yaml", this.state.yamlContent);
    formData.append("title", this.state.currentYaml);

    try {
      await this.requestService.call(this, () => this.requestService.uploadYaml(wikiStore.projects.current!.folder, formData));
      console.debug('Uploading yaml ', this.state.yamlContent);
      console.log("<YamlEditor> <- %c/upload_yaml%c with:", LOG.link, LOG.default);

      // follow-ups (success)
      wikiStore.output.isDownloadDisabled = false;


    } catch {
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
      wikiStore.table.isCellSelectable = true;
    }

  }

  async saveYaml() {
    // Check if yamlContent changed (if file not inported)
    if (!this.state.isYamlContentChanged && !this.state.isImportFile && !this.state.isAddedYaml) {
      wikiStore.yaml.haveToSaveYaml = false;
      return;
    }
    console.log("Save yaml");
    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    // send request
    const formData = new FormData();
    formData.append("yaml", this.state.yamlContent);
    formData.append("title", this.state.currentYaml);

    try {
      await this.requestService.call(this, () => this.requestService.saveYaml(wikiStore.projects.current!.folder, formData));

      // follow-ups (success)
      wikiStore.output.isDownloadDisabled = false;
    } catch {
      console.error("Save yaml failed.");
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
      wikiStore.table.isCellSelectable = true;

      wikiStore.yaml.haveToSaveYaml = false;
      this.setState({
        isYamlContentChanged: false,
        isImportFile: false,
        isAddedYaml: false,
      });
    }
  }

  handleChangeYaml() {
    wikiStore.table.isCellSelectable = false;

    const yamlContent = (this.monacoRef.current as any).editor.getModel().getValue();
    this.setState({ yamlContent: yamlContent, isYamlContentChanged: true });
    try {
      const yamlJson = (yaml.safeLoad(yamlContent) as JSON);
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        yamlParseErrMsg: null,
        yamlParseErrFloatMessage: '',
      });
    } catch (err) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        yamlParseErrMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
        yamlParseErrFloatMessage: err.stack,
      });
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
    this.setState({yamlNames: [...this.state.yamlNames, yamlName], currentYaml: yamlName});

    wikiStore.table.isCellSelectable = false;

    // upload local yaml
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (async() => {
      const yamlContent = reader.result;
      this.setState({ yamlContent: yamlContent as string, yamlTitle: yamlName });
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
        await this.saveYaml();
      } catch (err) {
        this.setState({
          yamlJson: null,
          isValidYaml: false,
          yamlParseErrMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
          yamlParseErrFloatMessage: err.stack
        });
      }
    });
  }

  updateYamlContent(yamlContent: string | undefined) {
    const newYamlContent = yamlContent || defaultYamlContent;
    this.setState({ yamlContent: newYamlContent });
    try {
      const yamlJson = (yaml.safeLoad(newYamlContent)) as JSON;
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        yamlParseErrMsg: null,
        yamlParseErrFloatMessage: ''
      });
    } catch (err) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        yamlParseErrMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
        yamlParseErrFloatMessage: err.stack
      });
    }
  }

  updateErrorFromStore(){
    const yamlError = wikiStore.yaml.yamlError;
    if (yamlError && yamlError!=""){
      console.log("Errors while applying yaml:")
      console.log(yamlError);
      console.log(wikiStore.layers.error);
      this.setState({
        yamlParseErrMsg: "⚠️ " + yamlError
      });
    }


  }

  updateYamlFiles(project: ProjectDTO) {
    if (wikiStore.projects.projectDTO && wikiStore.projects.projectDTO._saved_state.current_data_file) {
      this.setState({disableYaml: false});
    }

    const dataFile = project._saved_state.current_data_file;
    const sheetName = project._saved_state.current_sheet;
    if (dataFile) {
      if (project!.yaml_sheet_associations[dataFile] && project!.yaml_sheet_associations[dataFile][sheetName]) {
        this.setState({ yamlNames: project!.yaml_sheet_associations[dataFile][sheetName].val_arr,
          currentYaml: project!.yaml_sheet_associations[dataFile][sheetName].selected });
      } else {
        let yamlToCurrentSheet = project?._saved_state.current_sheet;
        if (yamlToCurrentSheet.endsWith('.csv')) {
          yamlToCurrentSheet = yamlToCurrentSheet.split('.csv')[0];
        } 
        if (!yamlToCurrentSheet.endsWith('.yaml')) {
          yamlToCurrentSheet += '.yaml';
        }

        this.setState({ yamlNames: [yamlToCurrentSheet],
          currentYaml: yamlToCurrentSheet });
      }
    }
  }

  async handleChangeFile(event: any) {
    wikiStore.yaml.showSpinner = true;
    const yaml = event.target.innerHTML;
    this.setState({currentYaml: yaml});
    wikiStore.yaml.haveToSaveYaml = true;
    try {
      await this.requestService.changeYaml(wikiStore.projects.current!.folder, yaml);
    } finally {
      wikiStore.yaml.showSpinner = false;
    }
  }

  async renameYaml(val: string, index: number) {
   // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
    const oldName = this.state.yamlNames[index];

    // Check if this yaml file exist, if not- save it before.
    if (!wikiStore.projects.projectDTO?.yaml_files.includes(oldName)) {
      await this.saveYaml();
    }

    // send request
    const formData = new FormData();
    formData.append("old_name", oldName);
    formData.append("new_name", val);

    try {
      await this.requestService.call(this, () => this.requestService.renameYaml(wikiStore.projects.current!.folder, formData));
      // update yaml files according to received project.
      this.setState({ yamlNames: wikiStore.projects.projectDTO!.yaml_files });
    } catch {
      console.error("Rename yaml failed.");
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }
  }

  async addYaml() {
    wikiStore.yaml.haveToSaveYaml = true;

    this.setState({
      isAddedYaml: true,
    });
    let i = 1;
    let yamlName = wikiStore.projects.projectDTO?._saved_state.current_sheet + "-" + i + ".yaml";  
    while (wikiStore.projects.projectDTO!.yaml_files.includes(yamlName)) {
      i++;
      yamlName = wikiStore.projects.projectDTO?._saved_state.current_sheet + "-" + i + ".yaml"; 
    }
    
    // remove /csv if there is
    const yamls = this.state.yamlNames;
    yamls.push(yamlName);
    
    this.setState({
      currentYaml: yamlName,
      yamlNames: yamls,
      
      yamlContent: defaultYamlContent
    });
    // await this.saveYaml();
    wikiStore.yaml.haveToSaveYaml = true;
  }

  render() {
    const { yamlContent } = this.state;

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
              YAML&nbsp;Editor
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
              onChange={() => this.handleChangeYaml()}
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
            <SheetSelector
              sheetNames={this.state.yamlNames}
              currSheetName={this.state.currentYaml}
              itemType="file"
              handleSelectSheet={(event) => this.handleChangeFile(event)}
              handleAddItem={() => this.addYaml()}
              handleDoubleClickItem={(val, index) => this.renameYaml(val, index)}
            />
          </Card.Footer>
        </Card>
      </Fragment>
    );
  }
}

export default YamlEditor;
