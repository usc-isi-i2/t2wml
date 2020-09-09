import React, { Component, Fragment } from 'react';

// YAML
import MonacoEditor from 'react-monaco-editor';
import yaml from 'js-yaml';

// App
import { Button, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage } from '../common/general';
import RequestService from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react"
import wikiStore from '../data/store';
import { defaultYamlText } from "./default-values";


interface yamlProperties {
  isShowing: boolean;
}

interface yamlState {
  yamlText: string;
  yamlTitle: string;
  yamlJson: JSON | null;
  isValidYaml: boolean;
  errMsg: string | null;
  errStack: string;
  errorMessage: ErrorMessage;
}

@observer
class YamlEditor extends Component<yamlProperties, yamlState> {
  private requestService: RequestService;

  constructor(props: yamlProperties) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {
      // yaml
      yamlText: defaultYamlText,
      yamlTitle: "",
      yamlJson: null,
      isValidYaml: true,
      errMsg: "",
      errStack: "",
      errorMessage: {} as ErrorMessage,
    };

    // init functions
    this.handleOpenYamlFile = this.handleOpenYamlFile.bind(this);

    wikiStore.yaml.updateYamlText = (yamlText: string | null = null) => this.updateYamlText(yamlText);
  }

  handleApplyYaml() {
    this.setState({ errorMessage: {} as ErrorMessage });  
    console.log("<YamlEditor> clicked apply");

    // remove current status
    wikiStore.table.updateYamlRegions();
    wikiStore.output.removeOutput();

    // before sending request
    wikiStore.table.showSpinner = true;

    // send request
    console.log("<YamlEditor> -> %c/upload_yaml%c for yaml regions", LOG.link, LOG.default);
    const formData = new FormData();
    formData.append("yaml", this.state.yamlText);
    formData.append("title", this.state.yamlTitle);
    // const sheetName = window.TableViewer.state.currSheetName;
    // if (sheetName !== null) {
    //   formData.append("sheet_name", sheetName)
    // }
    this.requestService.uploadYaml(wikiStore.project.pid, formData).then(json => {
      console.log("<YamlEditor> <- %c/upload_yaml%c with:", LOG.link, LOG.default);
      console.log(json);

    //   const { error } = json;
    //   // if failure
    //   if (error !== null) {
    //       this.setState({
    //           yamlJson: null,
    //           isValidYaml: false,
    //           errMsg: "⚠️There was an error applying YAML. Check browser console for details.",
    //           errStack: '',
    //       });
    //     // throw Error(error);
    //   }

          // else, success
        const { yamlRegions } = json;
        const internalError = yamlRegions.error;
        if (internalError){
            
            console.log("ERRORS while applying yaml:");
            console.log(internalError);
        }
        wikiStore.table.updateYamlRegions(yamlRegions);

        // follow-ups (success)
        wikiStore.table.showSpinner = false;
        wikiStore.output.isDownloadDisabled = false;
        wikiStore.table.isCellSelectable = true;

    }).catch((error: ErrorMessage) => {
    //   alert("Failed to apply. 🙁\n\n" + error);
        error.errorDescription += "\n\nFailed to apply. 🙁";
        this.setState({ errorMessage: error });

      // follow-ups (failure)
        wikiStore.table.showSpinner = false;
    });
  }

  handleChangeYaml() {
    wikiStore.table.isCellSelectable = false;

    // Talya: find out what's the right way to do this
    const yamlText = (this.refs.monaco as any).editor.getModel().getValue();
    this.setState({ yamlText: yamlText });
    try {
      const yamlJson = (yaml.safeLoad(yamlText) as JSON);
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        errMsg: null,
        errStack: '',
      });
    } catch (err) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        errMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
        errStack: err.stack,
      });
    }
  }

  handleOpenYamlFile(event: any) {
    // get file
    const file = (event.target as any).files[0];
    if (!file) return;
    console.log("<YamlEditor> opened file: " + file.name);

    wikiStore.table.isCellSelectable = false;

    // upload local yaml
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (() => {
      const yamlText = reader.result;
      this.setState({ yamlText: yamlText as string, yamlTitle:file.name });
      try {
        const yamlJson = (yaml.safeLoad((yamlText as string))) as JSON;
        this.setState({
          yamlJson: yamlJson,
          isValidYaml: true,
          errMsg: null,
          errStack: ''
        });
      } catch (err) {
        this.setState({
          yamlJson: null,
          isValidYaml: false,
          errMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
          errStack: err.stack
        });
      }
    });
  }

  updateYamlText(yamlText: string | null = null) {
    let newYamlText = yamlText;
    if (newYamlText === null) {
      newYamlText = defaultYamlText;
    }
    this.setState({ yamlText: newYamlText });
    try {
      const yamlJson = (yaml.safeLoad(newYamlText)) as JSON;
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        errMsg: null,
        errStack: ''
      });
    } catch (err) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        errMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
        errStack: err.stack
      });
    }
  }

  render() {
    const { yamlText } = this.state;

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
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }
        <Card
            className="w-100 shadow-sm"
            style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
        >
            
            {/* header */}
            <Card.Header
            style={{ height: "40px", padding: "0.5rem 1rem", background: "#006699" }}
            onClick={() => wikiStore.editors.nowShowing = "YamlEditor" }
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
                Upload
                </Button>
            </OverlayTrigger>

            {/* TODO: move following input to another place */}
            {/* hidden input of yaml file */}
            <input
                type="file"
                id="file_yaml"
                accept=".yaml"
                style={{ display: "none" }}
                onChange={this.handleOpenYamlFile}
                onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />

            </Card.Header>

            {/* yaml editor */}
            <Card.Body
            className="w-100 h-100 p-0"
            style={(this.props.isShowing) ? { overflow: "hidden" } : { display: "none" }}
            >
            <MonacoEditor
                ref="monaco"
                width="100%"
                height="100%"
                language="yaml"
                theme="vs"
                value={yamlText}
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
            />
            </Card.Body>

            {/* card footer */}
            <Card.Footer
            style={
                (this.props.isShowing) ? { height: "40px", padding: "0.5rem 1rem", background: "whitesmoke" } : { display: "none" }
            }
            >

            {/* error message */}
            <div
                className="d-inline-block text-truncate"
                style={{
                // fontFamily: "Menlo, Monaco, \"Courier New\", monospace",
                fontSize: "14px",
                color: "#990000",
                width: "calc(100% - 60px)",
                cursor: "help"
                }}
                title={this.state.errStack}
            >
                {this.state.errMsg}
            </div>

            {/* apply button */}
            <Button
                className="d-inline-block float-right"
                size="sm"
                style={{ borderColor: "#006699", background: "#006699", padding: "0rem 0.5rem" }}
                onClick={() => this.handleApplyYaml()}
                disabled={!this.state.isValidYaml}
            >
                Apply
            </Button>
            </Card.Footer>
        </Card>
      </Fragment>
    );
  }
}

export default YamlEditor;
