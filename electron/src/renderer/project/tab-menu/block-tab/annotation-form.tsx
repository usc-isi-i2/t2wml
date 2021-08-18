import React from 'react';

import { AnnotationBlock, AnnotationFields, EntityFields, nameQNodeFields, nameStrFields, ResponseWithQNodeLayerAndQnode, ResponseWithSuggestion } from '../../../common/dtos';
import * as utils from '../../table/table-utils';
import { ROLES, AnnotationOption } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { CellSelection, ErrorMessage } from '@/renderer/common/general';
import { QNode } from '@/renderer/common/dtos';
import wikiStore from '../../../data/store';

import { IReactionDisposer, reaction } from 'mobx';

import RequestService from '@/renderer/common/service';
import { currentFilesService } from '@/renderer/common/current-file-service';
import './annotation-form.css'
import ToastMessage from '@/renderer/common/toast';
import WikiBlockMenu from './wiki-block-menu';
import EditFieldMenu from './edit-field-menu';
import NodeField from './node-field';



const listQNodeFields = ["unit", "property", "subject"];

interface AnnotationFormState {
  selectedBlock?: AnnotationBlock;
  selection?: CellSelection;
  fields: AnnotationFields;
  showExtraFields: boolean;
  validArea: boolean;
  showResult1: boolean;
  showResult2: boolean;
  errorMessage: ErrorMessage;
  showEditFieldMenu: boolean;
  showWikifyBlockMenu: boolean;
  typeEditFieldMenu: string;
  mappingType?: string;
}


class AnnotationForm extends React.Component<{}, AnnotationFormState> {

  private changed: boolean;
  private timeoutId?: number;
  private timeoutChangeAreaId?: number;
  private timeoutSuggest?: number;
  private disposers: IReactionDisposer[] = [];
  private requestService: RequestService;

  constructor(props: any) {
    super(props);

    this.requestService = new RequestService();

    this.state = {
      fields: {},
      validArea: true,
      showExtraFields: false,
      showResult1: false,
      showResult2: false,
      errorMessage: {} as ErrorMessage,
      showEditFieldMenu: false,
      showWikifyBlockMenu: false,
      mappingType: currentFilesService.currentState.mappingType,
      typeEditFieldMenu: ""
    };
    this.changed = false;
  }

  componentDidMount() {
    this.disposers.push(reaction(() => currentFilesService.currentState.mappingType, (mappingType) => { this.setState({ mappingType }) }));
    this.disposers.push(reaction(() => wikiStore.table.selection.selectedBlock, (selectedBlock) => this.updateSelectedBlock(selectedBlock)));
    this.disposers.push(reaction(() => wikiStore.table.selection.selectionArea, (selection) => this.updateSelection(selection)));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  changeShowEditFieldMenu(newTypeEditFieldMenu: string) {
    const { showEditFieldMenu, typeEditFieldMenu } = this.state;
    if (typeEditFieldMenu === newTypeEditFieldMenu || !showEditFieldMenu) {
      this.setState({ showEditFieldMenu: !showEditFieldMenu });
    }
    this.setState({ typeEditFieldMenu: newTypeEditFieldMenu });
  }

  changeShowWikifyBlockMenu() {
    const { showWikifyBlockMenu } = this.state;
    this.setState({ showWikifyBlockMenu: !showWikifyBlockMenu });
  }


  async handleOnCreateQnode(key: string, entityFields: EntityFields) {
    console.log('Annotationn Menu handleOnCreateQnode triggered for -> ', entityFields);

    wikiStore.table.showSpinner = true;
    wikiStore.partialCsv.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    try {
      const response: ResponseWithQNodeLayerAndQnode = await this.requestService.call(this, () => (
        this.requestService.createQnode(entityFields)
      ));
      this.handleOnSelectNode(key, response.entity)
    } catch (error) {
      error.errorDescription = `Wasn't able to create the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.partialCsv.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

  }

  handleOnCloseEditFieldMenu(key: string, entityFields?: EntityFields) {
    this.setState({ showEditFieldMenu: false });
    if (entityFields && utils.isValidLabel(entityFields.label)) {
      this.handleOnCreateQnode(key, entityFields); // applyToBlock=true
    }
  }

  handleOnCloseWikifyBlockMenu() {
    this.setState({ showWikifyBlockMenu: false });
  }

  compareSelections(s1?: CellSelection, s2?: CellSelection): boolean {
    if (!s1 && s2) { return false; }
    if (s1 && !s2) { return false; }
    if (s1?.x1 !== s2?.x1 || s1?.x2 !== s2?.x2 || s1?.y1 !== s2?.y1 || s1?.y2 !== s2?.y2) {
      return false;
    }
    return true;
  }


  updateSelection(selection?: CellSelection) {
    this.setState({ validArea: true });
    if ((!wikiStore.table.selection.selectedBlock) || !this.compareSelections(wikiStore.table.selection.selectedBlock?.selection, selection)) {
      const selectedArea = selection ? utils.humanReadableSelection(selection) : undefined;
      const fields = { ...this.state.fields }
      if ((!wikiStore.table.selection.selectedBlock)) {
        /* eslint-disable */
        for (const [key, val] of Object.entries(fields)) {
          fields[key as keyof AnnotationFields] = undefined;
        }
        /* eslint-enable */
      }
      fields["selectedArea"] = selectedArea;
      this.setState({ selection: selection, fields },
        () => this.getAnnotationSuggestionsForSelection(selection))
    }
  }

  updateSelectedBlock(selectedBlock?: AnnotationBlock) {
    this.changed = false;
    if (selectedBlock) {
      if (this.timeoutSuggest) {
        window.clearTimeout(this.timeoutSuggest);
      }
      const selectedArea = utils.humanReadableSelection(selectedBlock.selection)

      this.setState({
        selectedBlock: selectedBlock,
        selection: selectedBlock.selection,
        fields: {
          selectedArea: selectedArea,
          role: selectedBlock.role,
          type: selectedBlock.type,
          unit: selectedBlock.unit,
          format: selectedBlock.format,
          calendar: selectedBlock.calendar,
          property: selectedBlock.property,
          language: selectedBlock.language,
          precision: selectedBlock.precision,
          subject: selectedBlock.subject,
        },
        showExtraFields: false
      })
    } else {
      this.setState({
        selectedBlock: undefined,
        selection: undefined,
        fields: {
          ...this.state.fields,
          selectedArea: undefined
        }
      });
    }
  }

  async updateSuggestion(suggestion: ResponseWithSuggestion) {
    if (suggestion && !wikiStore.table.selection.selectedBlock) {
      this.setState({
        fields: {
          ...this.state.fields,
          role: suggestion.role,
          type: suggestion.type,
          ...suggestion.children,
        }
      })
    }
  }

  async getAnnotationSuggestionsForSelection(selection?: { 'x1': number, 'x2': number, 'y1': number, 'y2': number }) {
    if (!selection) { return; }
    if (wikiStore.table.selection.selectedBlock) { console.log("returned because state had a block"); return; }
    // data should be a json dictionary, with fields:
    // {
    //   "selection": The block,
    //   "annotations": the existing annotations (a list of blocks, for the first block this would be an empty list)
    // }
    if (this.timeoutSuggest) {
      window.clearTimeout(this.timeoutSuggest);
    }
    this.timeoutSuggest = window.setTimeout(async () => {
      const suggestion = await this.requestService.getAnnotationSuggestions({ "selection": selection, "annotations": wikiStore.annotations.blocks });
      this.updateSuggestion(suggestion)
    }, 150);
  }


  handleOnChange(event: KeyboardEvent, key: string) { 
    if (event.code === 'Enter') {
      event.preventDefault();
      this.handleOnSubmit(event);
    }
    const value = (event.target as HTMLInputElement).value;
    const updatedFields = { ...this.state.fields }

    updatedFields[(key as keyof AnnotationFields) as nameStrFields] = value;

    this.changed = true;

    if (key === 'role') {
      if (value === "dependentVar" || value === "qualifier") {
        updatedFields['type'] = "string";
      } else { //| "metadata" | "property" | "mainSubject" | "unit"
        updatedFields['type'] = undefined;
      }
    }

    this.setState({ fields: updatedFields }, () => this.handleOnSubmit());
  }


  validationSelectionArea(selection: CellSelection) {
    if (selection.x1 <= selection.x2 && selection.y1 <= selection.y2 &&
      selection.x2 <= wikiStore.table.table.dims[1] && selection.y2 <= wikiStore.table.table.dims[0]) {
      this.setState({ validArea: true });
    } else {
      this.setState({ validArea: false });
    }
  }

  handleOnSelectionChange(event: React.ChangeEvent) {
    const value = (event.target as HTMLInputElement).value;
    this.changed = true;
    const fields = { ...this.state.fields }
    fields.selectedArea = value;
    this.setState({ fields });
    const regex = /^([a-z]+)([0-9]+):([a-z]+)([0-9]+)$/gmi;
    const groups = regex.exec(value);
    if (groups && groups[1] && groups[2] && groups[3] && groups[4]) {
      const selection: CellSelection = {
        x1: utils.letterToColumn(groups[1]),
        x2: utils.letterToColumn(groups[3]),
        y1: parseInt(groups[2]),
        y2: parseInt(groups[4]),
      };
      this.validationSelectionArea(selection);
      if (this.timeoutChangeAreaId) {
        window.clearTimeout(this.timeoutChangeAreaId);
      }
      this.timeoutChangeAreaId = window.setTimeout(() => {
        if (this.state.validArea) {
          wikiStore.table.updateSelection(selection)
          this.handleOnSubmit()
        }
      }, 500);
    } else {
      this.setState({ validArea: false });
    }
  }

  async postAnnotations(annotations: AnnotationBlock[]) {
    wikiStore.table.showSpinner = true;
    try {
      await this.requestService.call(this, () => (
        this.requestService.postAnnotationBlocks(
          { 'annotations': annotations, "title": currentFilesService.currentState.mappingFile }
        )
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot submit annotations!";
      this.setState({ errorMessage: error });
    }

    wikiStore.table.showSpinner = false;

    wikiStore.partialCsv.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.partialCsv.showSpinner = false;
    }
  }

  async handleOnSubmit(event?: any) {
    if (event) event.preventDefault();
    const { fields, selectedBlock, selection } = this.state;
    if (!fields.selectedArea || !(selection && fields.role)) { return null; }

    const annotations = wikiStore.annotations.blocks.filter(block => {
      return block.id !== selectedBlock?.id;
    });

    let annotation: any = {}
    if (selectedBlock){
    const currentAnnotation = wikiStore.annotations.blocks.filter(block => {
      return block.id == selectedBlock?.id;
    });
    if (currentAnnotation){
      annotation = currentAnnotation[0]
    }
  }
    annotation["selection"]=selection

    // Add all updated values from the annotation form
    for (const [key, value] of Object.entries(fields)) {
      annotation[key] = value;
    }



    // if (!fields.property && searchFields.property && searchFields.property.startsWith("P")) {
    //   try {
    //     const response = await this.requestService.call(this, () => (
    //       this.requestService.getQnodeById(searchFields.property)
    //     ));
    //     if (response?.id) {
    //       annotation["property"] = response;
    //     }
    //   } catch (error) {
    //     error.errorDescription = `Wasn't able to found the qnode!\n` + error.errorDescription;
    //     console.log(error.errorDescription)
    //     this.setState({ errorMessage: error });
    //   }
    // }
    // if (!fields.unit && searchFields.unit && searchFields.unit.startsWith("Q")) {
    //   try {
    //     const response = await this.requestService.call(this, () => (
    //       this.requestService.getQnodeById(searchFields.unit)
    //     ));
    //     if (response?.id) {
    //       annotation["unit"] = response;
    //     }

    //   } catch (error) {
    //     error.errorDescription = `Wasn't able to found the qnode!\n` + error.errorDescription;
    //     console.log(error.errorDescription)
    //     this.setState({ errorMessage: error });
    //   }
    // }

    annotations.push(annotation);
    this.postAnnotations(annotations);

  }

  handleOnDelete(event: React.MouseEvent) {
    event.preventDefault();

    const { selectedBlock } = this.state
    if (!selectedBlock) { return; }

    const annotations = wikiStore.annotations.blocks.filter(block => {
      return block.id !== selectedBlock.id;
    });
    this.postAnnotations(annotations);

  }


  renderSelectionAreas() {
    const { selectedArea } = this.state.fields;
    if (!selectedArea) { return null; }
    return (
      <Form.Group as={Row} style={{ marginTop: "1rem" }}>
        <Form.Label column sm="12" md="3" className="text-muted">
          Selected area
        </Form.Label>
        <Col sm="12" md="9">
          <Form.Control
            required
            type="text" size="sm"
            value={selectedArea}
            onChange={(event: React.ChangeEvent) => this.handleOnSelectionChange(event)}
            isInvalid={!this.state.validArea} />
          <Form.Control.Feedback type="invalid">
            Please choose a valid range.
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
    )
  }

  renderNestedOptionsChildren(type: any) {

    const key: string = type.label.toLowerCase();
    const { selectedBlock } = this.state;

    let defaultValue = '--';
    if (selectedBlock && (selectedBlock as any)[type.value]) {
      defaultValue = (selectedBlock as any)[type.value];
    }

    if (type.children) { // else: type is property or unit
      return (
        <Form.Group as={Row} key={type.value} style={{ marginTop: "1rem" }}>
          <Form.Label column sm="12" md="3" className="text-muted">{type.label}</Form.Label>
          <Col sm="12" md="9">
            <Form.Control size="sm" as="select" key={defaultValue} defaultValue={defaultValue}
              onChange={(event: any) => this.handleOnChange(event, type.value)}>
              <option disabled value="--">--</option>
              {type.children.map((option: AnnotationOption) => (
                <option key={option.value}
                  value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Control>
          </Col>
        </Form.Group>
      )
    }
    // type is property or unit OR format/Language!
    const { fields } = this.state;
    if (listQNodeFields.includes(key)) {
      return (
        <NodeField
          key={type.value}
          selectedBlock={selectedBlock}
          fields={fields}
          type={type}
          onChangeFields={(fields: AnnotationFields) => this.setState({ fields: fields }, () => this.handleOnSubmit())}
          changeShowEditFieldMenu={(newTypeEditFieldMenu: string) => this.changeShowEditFieldMenu(newTypeEditFieldMenu)}
        />

      )
    } else {
      if (fields && (fields as any)[type.value]) {
        defaultValue = (fields as any)[type.value];
      } else {
        defaultValue = "";
      }
      return (
        <Form.Group as={Row} key={type.value} style={{ marginTop: "1rem" }} noGutters>
          <Form.Label column sm="12" md="3" className="text-muted">{type.label}</Form.Label>
          <Col sm='12' md='9'>
            <Form.Control
              type="text" size="sm"
              value={defaultValue}
              onChange={(event: any) => this.handleOnChange(event, type.value)}
            />
            {type.value == "format" ? <Form.Label> (must be enclosed in quotes eg &quot;%Y&quot;)</Form.Label> : null}
          </Col>
        </Form.Group>
      )
    }
  }

  renderNestedOptions() {
    const { role, type } = this.state.fields;

    let selectedOptionRole = null;
    selectedOptionRole = ROLES.find(option => option.value === role);

    if (!selectedOptionRole || !('children' in selectedOptionRole)) { return null; }
    const optionsDropdown = (
      <Form.Group as={Row} style={{ marginTop: "1rem" }}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Form.Label column sm="12" md="3" className="text-muted">Type</Form.Label>
        <Col sm="12" md="9">
          <Form.Control size="sm" as="select" key={type} defaultValue={type}>
            {selectedOptionRole?.children?.map((optionType, i) => (
              <option key={i}
                value={optionType.value}>
                {optionType.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
    let selectedType = null;
    selectedType = selectedOptionRole?.children?.find(option => (option.value === type));

    if (!selectedType || !('children' in selectedType)) {
      return optionsDropdown;
    } else {
      return ( //show property field regardless of extra field toggle
        <React.Fragment>
          {optionsDropdown}
          {
            selectedType.children.length > 1 ?
              <Form.Label style={{ color: 'grey' }} onClick={() => { this.setState({ showExtraFields: !this.state.showExtraFields }) }}>
                Toggle additional fields
              </Form.Label>
              : null
          }
          {
            this.state.showExtraFields && selectedType.children.length > 1
              ?
              selectedType?.children?.map(type => { return this.renderNestedOptionsChildren(type); })
              :
              this.renderNestedOptionsChildren({
                'label': 'Property',
                'value': 'property',
              })
          }
        </React.Fragment>
      )
    }
  }

  renderRolesDropdown() {
    const { role } = this.state.fields;

    const rolesList = ROLES;
    const selectedAnnotationRole = role ? role : rolesList[0].value;

    return (
      <Form.Group as={Row} style={{ marginTop: "1rem" }}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'role')}>
        <Form.Label column sm="12" md="3" className="text-muted">Role</Form.Label>
        <Col sm="12" md="9">
          <Form.Control size="sm" as="select" key={selectedAnnotationRole} defaultValue={selectedAnnotationRole}>
            {rolesList.map((role, i) => (
              <option key={i}
                value={role.value}>
                {role.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
  }

  handleOnSelectNode(key: string, value?: QNode) {
    if (listQNodeFields.includes(key)) {
      const fields = { ...this.state.fields };
      fields[(key as keyof AnnotationFields) as nameQNodeFields] = value;
      this.setState({ fields }, () => this.handleOnSubmit());
    }
  }


  renderSubmitButton() {
    const { role, type } = this.state.fields;
    return (
      <Form.Group as={Row}>
        {(role === 'unit' || role === 'mainSubject' || type === 'wikibaseitem' || role === "property") ?
          <Col sm="12" md="12" style={{ marginTop: "0.5rem" }}>
            <Button
              size="sm"
              type="button"
              variant="outline-dark"
              onClick={() => this.changeShowWikifyBlockMenu()}>
              Edit block wikification
            </Button>
          </Col>
          : null
        }
        <Col sm="12" md="12" style={{ marginTop: "0.5rem" }}>
          {/* <Button
            size="sm"
            type="submit"
            variant="outline-dark">
            Submit
          </Button> */}
          {this.renderDeleteButton()}
        </Col>
      </Form.Group>
    )
  }

  renderDeleteButton() {
    const { selectedBlock } = this.state;
    if (selectedBlock) {
      return (
        <Button
          size="sm"
          type="button"
          variant="outline-danger"
          style={{ float: 'right' }}
          onClick={(event: React.MouseEvent) => this.handleOnDelete(event)}>
          delete this annotation block
        </Button>
      )
    }
  }

  render() {
    const { selection, showEditFieldMenu, typeEditFieldMenu, errorMessage, fields, showWikifyBlockMenu, selectedBlock } = this.state;
    if (this.state.mappingType == "Yaml") { return <div>Block mode not relevant when working with a yaml file</div> }
    if (!selection) { return <div>Please select a block</div>; }
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>

        {errorMessage.errorDescription ? <ToastMessage message={errorMessage} /> : null}
        {this.renderSelectionAreas()}
        {this.renderRolesDropdown()}
        {this.renderNestedOptions()}
        {/* render subject: */}
        {
          fields.role === "dependentVar" ?
            <NodeField
              key={"subject"}
              selectedBlock={selectedBlock}
              fields={fields}
              type={{ label: "Subject", value: "subject" }}
              onChangeFields={(fields: AnnotationFields) => this.setState({ fields: fields }, () => this.handleOnSubmit())}
              changeShowEditFieldMenu={(newTypeEditFieldMenu: string) => this.changeShowEditFieldMenu(newTypeEditFieldMenu)}
            />
            : null
        }
        {this.renderSubmitButton()}

        {
          showEditFieldMenu && selection ?
            <EditFieldMenu
              selection={selection}
              onClose={(key: string, entityFields?: EntityFields) => this.handleOnCloseEditFieldMenu(key, entityFields)}
              title={typeEditFieldMenu}
              // showResults={this.state.showResult1}
              onSelectNode={this.handleOnSelectNode.bind(this)}
            />
            : null
        }
        {
          showWikifyBlockMenu ?
            <WikiBlockMenu
              selection={selection}
              onClose={() => { this.setState({ showWikifyBlockMenu: false }); }}
              onGetError={(error: ErrorMessage) => { this.setState({ errorMessage: error }); }}
              role={fields.role}
              type={fields.type}
            />
            : null
        }

      </Form>
    )
  }
}


export default AnnotationForm;
