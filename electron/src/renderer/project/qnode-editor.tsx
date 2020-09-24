import React, { Component } from 'react';

import { Button, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';

import wikiStore from '../data/store';

interface qnodeProperties {
  charPress: string;
  keyPress: number;
  value: string;

  stopEditing: (stop: boolean) => void;
}

interface qnodeState {
  value: string;
  scope: number;
  highlightAllOnFocus: boolean;
  cancelAfterEnd: boolean;
  isValidValue: boolean;
}

class QnodeEditor extends Component<qnodeProperties, qnodeState> {

  tempQnodeEditorRef: any = React.createRef();

  constructor(props: qnodeProperties) {
    super(props);
    // console.log(props);

    // init state
    this.state = this.createInitState(props);
    // this.state = {
    //   value: this.props.value,
    //   scope: 0,
    //   highlightAllOnFocus: false,
    //   cancelAfterEnd: true,
    //   isValidValue: true,
    // };
    wikiStore.wikifier.scope = 0;

    // init functions
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    // Talya - find out how to write this the correct way
    (this.tempQnodeEditorRef.current as HTMLInputElement).addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    (this.tempQnodeEditorRef.current as HTMLInputElement).removeEventListener('keydown', this.handleKeyDown);
  }

  createInitState(props: qnodeProperties) {
    if (props.keyPress === 8 || props.keyPress === 46) {
      // if BACKSPACE (8) or DELETE (46) pressed, we clear the cell
      return {
        value: "",
        scope: 0,
        highlightAllOnFocus: false,
        cancelAfterEnd: true,
        isValidValue: true
      } as qnodeState;
    } else if (props.charPress) {
      // if a letter was pressed, we start with the letter
      return {
        value: props.charPress,
        scope: 0,
        highlightAllOnFocus: false,
        cancelAfterEnd: true,
        isValidValue: true
      } as qnodeState;
    } else {
      // otherwise we start with the current value
      return {
        value: props.value,
        scope: 0,
        highlightAllOnFocus: true,
        cancelAfterEnd: true,
        isValidValue: true
      } as qnodeState;
    }
  }

  afterGuiAttached() {
    // get ref from React component
    const eInput = this.tempQnodeEditorRef.current as HTMLInputElement;
    (eInput).focus();
    if (this.state.highlightAllOnFocus) {
      eInput.select();
      this.setState({ highlightAllOnFocus: false })
    } else {
      // when we started editing, we want the carot at the end, not the start.
      // this comes into play in two scenarios: a) when user hits F2 and b)
      // when user hits a printable character, then on IE (and only IE) the carot
      // was placed after the first character, thus 'apply' would end up as 'pplea'
      const length = eInput.value ? eInput.value.length : 0;
      if (length > 0) {
        eInput.setSelectionRange(length, length);
      }
    }
  }

  getValue() {
    return this.state.value;
  }

  handleChangeValue(value: string) {
    let isValidValue;
    if (/^Q\d+$/.test(value) || /^$/.test(value)) {
      // valid if "Q..." or ""
      isValidValue = true;
    } else {
      isValidValue = false;
    }
    this.setState({
      value: value,
      isValidValue: isValidValue
    });
  }

  handleChangeScope(scope: number) {
    this.setState({ scope: scope });
    wikiStore.wikifier.scope = scope;
  }

  handleClickUpdateQnode() {
    this.setState({ cancelAfterEnd: false });
    // this.props.stopEditing(false);
    setTimeout(this.handleStopEditing.bind(this), 100);
  }

  handleDeleteQnode() {
    this.setState({ value: "", cancelAfterEnd: false });
    // this.props.stopEditing(false);
    setTimeout(this.handleStopEditing.bind(this), 100);
  }

  handleKeyDown(event: KeyboardEvent) {
    if ([37, 39, 8, 46].indexOf(event.keyCode) > -1) {
      // if LEFT (37) or RIGHT (39) or BACKSPACE (8) or DELETE (46) pressed, we clear the cell
      event.stopPropagation();
      return;
    }
  }

  handleStopEditing() {
    this.props.stopEditing(false); // cancel = false
  }

  isCancelAfterEnd() {
    const { cancelAfterEnd, isValidValue } = this.state;
    if (!cancelAfterEnd && isValidValue) {
      return false;
    } else {
      // others, do cancel
      return true;
    }
  }

  isCancelBeforeStart() {
    // return this.props.charPress && ('0123456789'.indexOf(this.props.charPress) < 0);
    return false;
  }

  isPopup() {
    return true;
  }

  render() {
    const { value, scope, isValidValue } = this.state;

    // scope button styles
    const currScopeStyle = {
      padding: "0rem 0.5rem",
      color: "white",
      background: "hsl(200, 100%, 30%)",
      border: "1px solid hsl(200, 100%, 30%)"
    };
    const otherScopeStyle = {
      padding: "0rem 0.5rem",
      color: "hsl(200, 100%, 30%)",
      background: "",
      border: "1px solid hsl(200, 100%, 30%)"
    };

    // scope button tooltips
    const scope0TooltipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="scope0">
        <div className="text-left small">
          Apply to this cell only
        </div>
      </Tooltip>
    );
    const scope1TooltipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="scope1">
        <div className="text-left small">
          Apply to all cells with same value in this region
        </div>
      </Tooltip>
    );
    const scope2TooltipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="scope2">
        <div className="text-left small">
          Apply to all cells with same value in all regions
        </div>
      </Tooltip>
    );

    return (
      <div>

        {/* input */}
        <input
          ref={this.tempQnodeEditorRef}
          value={value}
          onChange={(event) => this.handleChangeValue(event.target.value)}
          style={isValidValue ? { width: "100%" } : { width: "100%", borderColor: "red" }}
        />

        <div style={{ padding: "5px", fontSize: "12px", lineHeight: "16px" }}>

          {/* apply to */}
          <div style={{ padding: "5px", background: "whitesmoke", borderRadius: "4px" }}>
            <span style={{ fontWeight: 600 }}>
              Scope:&nbsp;
            </span>
            <ButtonGroup>
              <OverlayTrigger overlay={scope0TooltipHtml} placement="bottom" trigger={["hover", "focus"]}>
                <Button
                  variant="outline-light"
                  size="sm"
                  style={(scope === 0) ? currScopeStyle : otherScopeStyle}
                  onClick={() => this.handleChangeScope(0)}
                >
                  Cell
                </Button>
              </OverlayTrigger>
              <OverlayTrigger overlay={scope1TooltipHtml} placement="bottom" trigger={["hover", "focus"]}>
                <Button
                  variant="outline-light"
                  size="sm"
                  style={(scope === 1) ? currScopeStyle : otherScopeStyle}
                  disabled={wikiStore.wikifier.state && wikiStore.wikifier.state.currRegion === "All"}
                  onClick={() => this.handleChangeScope(1)}
                >
                  Region
                </Button>
              </OverlayTrigger>
              <OverlayTrigger overlay={scope2TooltipHtml} placement="bottom" trigger={["hover", "focus"]}>
                <Button
                  variant="outline-light"
                  size="sm"
                  style={(scope === 2) ? currScopeStyle : otherScopeStyle}
                  onClick={() => this.handleChangeScope(2)}
                >
                  All
                </Button>
              </OverlayTrigger>
            </ButtonGroup>
          </div>

          {/* buttons */}
          <div style={{ height: "30px", paddingTop: "5px", paddingBottom: "5px" }}>
            <Button
              className="d-inline-block float-left"
              variant="danger"
              size="sm"
              style={{
                padding: "0rem 0.5rem",
                color: "white",
                background: "hsl(0, 100%, 30%)",
                border: "1px solid hsl(0, 100%, 30%)"
              }}
              disabled={isValidValue ? false : true}
              onClick={this.handleDeleteQnode.bind(this)}
            >
              Delete
            </Button>
            <Button
              className="d-inline-block float-right"
              variant="success"
              size="sm"
              style={{
                padding: "0rem 0.5rem",
                color: "white",
                background: "hsl(150, 50%, 40%)",
                border: "1px solid hsl(150, 50%, 40%)"
              }}
              disabled={isValidValue ? false : true}
              onClick={this.handleClickUpdateQnode.bind(this)}
            >
              Update
            </Button>
          </div>

        </div>
      </div>
    );
  }
}

export default QnodeEditor;
