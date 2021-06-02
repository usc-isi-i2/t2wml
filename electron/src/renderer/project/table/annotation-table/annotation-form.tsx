import React from 'react';

import { AnnotationBlock, EntityFields, ResponseWithSuggestion } from '../../../common/dtos';
import * as utils from '../table-utils';
import { ROLES, AnnotationOption } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { CellSelection, ErrorMessage } from '@/renderer/common/general';
import SearchResults from './search-results';
import { QNode } from '@/renderer/common/dtos';
import wikiStore from '../../../data/store';

import { IReactionDisposer, reaction } from 'mobx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { columnToLetter } from '../table-utils';
import RequestService from '@/renderer/common/service';
import { currentFilesService } from '@/renderer/common/current-file-service';
import EntityMenu from '../entity-menu';
import './annotation-form.css'


interface AnnotationFields {
  role?: string;
  type?: string;
  unit?: string;
  format?: string;
  calendar?: string;
  property?: string;
  language?: string;
  precision?: string;
  selectedArea?: string;
  subject?: string;
}


interface AnnotationFormState {
  selectedBlock?: AnnotationBlock;
  selection?: CellSelection;
  annotationSuggestions: ResponseWithSuggestion;
  fields: AnnotationFields;
  showExtraFields: boolean;
  validArea: boolean;
  showResult1: boolean;
  showResult2: boolean;
  subject: {
    value?: string;
    instanceOfSearch?: string;
    instanceOf?: QNode;
    qnodes: QNode[];
    selected?: QNode;
  };
  errorMessage: ErrorMessage;
  showEntityMenu: boolean;
  typeEntityMenu?: string;
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
    const instanceOf = {
      label: 'country',
      description: 'the distinct region in geography; a broad term that can include political divisions or regions associated with distinct political characteristics',
      id: 'Q6256',
      url: 'https://www.wikidata.org/wiki/Q6256'
    }
    const annotationSuggestions = { role: '', type: undefined, children: {} };

    this.state = {
      annotationSuggestions: annotationSuggestions,
      fields: {},
      subject: {
        value: undefined,
        instanceOfSearch: undefined,
        instanceOf: instanceOf,
        qnodes: [],
      },
      validArea: true,
      showExtraFields: false,
      showResult1: false,
      showResult2: false,
      errorMessage: {} as ErrorMessage,
      showEntityMenu: false
    };
    this.changed = false;
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.subjectQnodes.qnodes, (qnodes) => this.updateSubjectQNodes(qnodes)));
    this.disposers.push(reaction(() => wikiStore.table.selectedBlock, (selectedBlock) => this.updateSelectedBlock(selectedBlock)));
    this.disposers.push(reaction(() => wikiStore.table.selection, (selection) => this.updateSelection(selection)));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  changeShowEntityMenu(newTypeEntityMenu: string) {
    const { showEntityMenu, typeEntityMenu } = this.state;
    if (typeEntityMenu === newTypeEntityMenu || !showEntityMenu) {
      this.setState({ showEntityMenu: !showEntityMenu });
    }
    this.setState({ typeEntityMenu: newTypeEntityMenu });
  }

  async handleOnCreateQnode(entityFields: EntityFields) {
    console.log('Annotationn Menu handleOnCreateQnode triggered for -> ', entityFields);

    let hasError = false;
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { typeEntityMenu } = this.state;
    // selection = [[col, row], [col, row]];
    const cellsSelectionState = this.state.selection;
    if (!cellsSelectionState) { return; }
    const selection = [
      [cellsSelectionState.x1 - 1, cellsSelectionState.y1 - 1],
      [cellsSelectionState.x2 - 1, cellsSelectionState.y2 - 1],
    ];

    try {
      const response = await this.requestService.call(this, () => (
        this.requestService.createQnode(entityFields, selection)
      ));
      debugger;
      this.handleOnSelect(typeEntityMenu?.toLowerCase() || 'property', response.id)
    } catch (error) {
      error.errorDescription = `Wasn't able to create the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
      hasError = true;
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

    //also update results:
    if (!hasError) {
      try {
        wikiStore.output.showSpinner = true;
        await this.requestService.call(this, () => this.requestService.getMappingCalculation())
      }
      catch (error) {
        console.log(error) //don't break on this
      }
      finally {
        wikiStore.output.showSpinner = false;
      }
      wikiStore.wikifier.showSpinner = true;
      try {
        await this.requestService.getPartialCsv();
      }
      finally {
        wikiStore.wikifier.showSpinner = false;
      }
    }
  }

  handleOnCloseEntityMenu(entityFields?: EntityFields) {
    this.setState({ showEntityMenu: false });
    if (entityFields) {
      if (utils.isValidLabel(entityFields.label)) {
        this.handleOnCreateQnode(entityFields); // applyToBlock=true
      }
    }
  }

  updateSelection(selection?: CellSelection) {
    if ((!wikiStore.table.selectedBlock) || wikiStore.table.selectedBlock.selection !== selection) {
      const selectedArea = selection ? utils.humanReadableSelection(selection) : undefined;
      const fields = { ...this.state.fields }
      fields["selectedArea"] = selectedArea;
      this.setState({ selection: selection, fields },
        () => this.getAnnotationSuggestionsForSelection(selection))
    }
    // else{
    //   this.setState({ selection: selection});
    // }
  }

  updateSelectedBlock(selectedBlock?: AnnotationBlock) {
    this.changed = false;
    if (selectedBlock) {
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
    if (suggestion) {
      this.setState({
        annotationSuggestions: suggestion,
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
    if (this.state.selectedBlock) { console.log("returned because state had a block"); return; }
    //data should be a json dictionary, with fields:
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
    }, 200);
  }

  async handleOnPropertyUnit(key: string, value: string, type: string) {

    if (key === 'property') {
      try {
        await this.requestService.call(this, () => (
          this.requestService.getProperties(value, type)
        ));
      } catch (error) {
        error.errorDescription += `\nWasn't able to find any properties for ${value}`;
        this.setState({ errorMessage: error });
      } finally {
        console.log('properties request finished');
      }
    }

    if (key === 'unit') {

      const instanceOf: QNode = {
        label: 'unit of measurement',
        description: 'quantity, defined and adopted by convention',
        id: 'Q47574',
      }

      try {
        await this.requestService.call(this, () => (
          this.requestService.getQNodes(value, false, instanceOf)
        ));
      } catch (error) {
        error.errorDescription += `\nWasn't able to find any qnodes for ${value}`;
        this.setState({ errorMessage: error });
      } finally {
        console.log('qnodes request finished');
      }
    }
  }

  handleOnChange(event: KeyboardEvent, key: string) {
    if (event.code === 'Enter') {
      event.preventDefault();
      this.handleOnSubmit(event);
    }

    this.setState({showEntityMenu: false});
    const value = (event.target as HTMLInputElement).value;
    const updatedFields = { ...this.state.fields }
    updatedFields[key as keyof AnnotationFields] = value;
    this.changed = true;

    // Reset the role if the type has changed
    if (key === 'role') {
      updatedFields['type'] = undefined;
    }

    this.setState({ fields: updatedFields }, () => {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
      }
      this.timeoutId = window.setTimeout(() => {
        let { type } = this.state.fields;
        if (key === 'unit' || key === 'property') {
          this.setState({ showResult1: true, showResult2: false })
        }
        if (!type) { type = "string"; }
        this.handleOnPropertyUnit(key, value, type);
      }, 300);
    });
  }

  validationSelectionArea(selection: CellSelection) {
    if (selection.x1 <= selection.x2 && selection.y1 <= selection.y2) {
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
    const regex = /^.?([a-z]+)([0-9]+):([a-z]+)([0-9]+).?$/gmi;
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
          wikiStore.table.selection = selection;
        }
      }, 500);
    } else {
      this.setState({ validArea: false });
    }
  }

  async postAnnotations(annotations: AnnotationBlock[], annotation?: AnnotationBlock) {
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

    if (annotation) {
      if (annotation.role && annotation.selection && annotation.role == "mainSubject") {
        try {
          await this.requestService.call(this, () => (
            this.requestService.callCountryWikifier({ "selection": annotation.selection })
          ))
        }
        catch (error) {
          //do nothing...
        }
      }
      wikiStore.table.selectBlock(utils.checkSelectedAnnotationBlocks(annotation.selection))
    } else {
      wikiStore.table.resetSelections();
    }

    wikiStore.table.showSpinner = false;

    wikiStore.wikifier.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.wikifier.showSpinner = false;
    }
  }

  handleOnSubmit(event?: any) {
    if (event) event.preventDefault();
    const { fields, selectedBlock, selection } = this.state;
    if (!fields.selectedArea || !(selection && fields.role)) { return null; }
    const annotations = wikiStore.annotations.blocks.filter(block => {
      return block.id !== selectedBlock?.id;
    });
    const annotation: any = {
      selection: selection
    };
    // Add all updated values from the annotation form
    for (const [key, value] of Object.entries(fields)) {
      annotation[key] = value;
    }

    annotations.push(annotation);
    this.postAnnotations(annotations, annotation);

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
    // console.log("render selection areas", selectedArea)
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

    if (type.children) {
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

    const propertyBlockId = selectedBlock?.links?.property;
    let propertyBlockSelection = "";
    if (propertyBlockId) {
      for (const block of wikiStore.annotations.blocks) {
        if (block.id == propertyBlockId) {
          const { x1, x2, y1, y2 } = block.selection;
          propertyBlockSelection = `${columnToLetter(x1)}${y1}` + ":" + `${columnToLetter(x2)}${y2}`
        }
      }
    }
    const unitBlockId = selectedBlock?.links?.unit;
    let unitBlockSelection = "";
    if (unitBlockId) {
      for (const block of wikiStore.annotations.blocks) {
        if (block.id == unitBlockId) {
          const { x1, x2, y1, y2 } = block.selection;
          unitBlockSelection = `${columnToLetter(x1)}${y1}` + ":" + `${columnToLetter(x2)}${y2}`
        }
      }
    }
    defaultValue = defaultValue == "--" ? "" : defaultValue;
    return (
      <Form.Group as={Row} key={type.value} style={{ marginTop: "1rem" }}>
        <Form.Label column sm="12" md="3" className="text-muted">{type.label}</Form.Label>
        <Col sm='12' md={(key == 'property' && propertyBlockId) || (key == 'unit' && unitBlockId) ? '4' : '6'}>
          <Form.Control
            type="text" size="sm"
            key={defaultValue}
            defaultValue={defaultValue}
            onChange={(event: any) => this.handleOnChange(event, type.value)}
          />
          {type.value == "format" ? <Form.Label> (must be enclosed in quotes eg &quot;%Y&quot;)</Form.Label> : null}
        </Col>

        <Col sm="12" md="3">
          <Button
            type="button"
            size="sm"
            variant="outline-dark"
            onClick={() => this.changeShowEntityMenu(type.label)}>
            Create entity
          </Button>
        </Col>
        {
          key == "property" && propertyBlockId ?
            <Col sm="12" md='2'>
              <Form.Control
                type="text" size="sm"
                value={propertyBlockSelection}
                readOnly />
            </Col>
            : key == "unit" && unitBlockId ?
              <Col sm="12" md='2'>
                <Form.Control
                  type="text" size="sm"
                  value={unitBlockSelection}
                  readOnly />
              </Col>
              : null
        }

      </Form.Group>
    )
  }

  renderNestedOptions() {
    const { role, type } = this.state.fields;
    const { annotationSuggestions } = this.state;
    const { selectedBlock } = this.state;
    const selectedAnnotationRole = selectedBlock && !this.changed ? selectedBlock.role : role;
    let selectedAnnotationType = selectedBlock && !this.changed ? selectedBlock.type : type;
    if (!selectedAnnotationType) {
      // default to string:
      selectedAnnotationType = annotationSuggestions.type ? annotationSuggestions.type : "string";
    }
    let selectedOption = null;
    if (selectedAnnotationRole) {
      selectedOption = ROLES.find(option => (
        option.value === selectedAnnotationRole
      ));
    } else {
      selectedOption = ROLES.find(option => option.value === role);
      if (!selectedOption) {
        selectedOption = ROLES.find(option => option.value === annotationSuggestions.role);
      }
    }
    if (!selectedOption || !('children' in selectedOption)) { return null; }
    const optionsDropdown = (
      <Form.Group as={Row} style={{ marginTop: "1rem" }}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Form.Label column sm="12" md="3" className="text-muted">Type</Form.Label>
        <Col sm="12" md="9">
          <Form.Control size="sm" as="select" key={selectedAnnotationType} defaultValue={selectedAnnotationType}>
            {selectedOption?.children?.map((type, i) => (
              <option key={i}
                value={type.value}>
                {type.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
    let selectedType = null;
    if (selectedAnnotationType) {
      selectedType = selectedOption?.children?.find(option => (
        option.value === selectedAnnotationType
      ));
    } else {
      selectedType = selectedOption?.children?.find(option => (
        option.value === type
      ));
    }
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
    const { selectedBlock, annotationSuggestions } = this.state;

    const rolesList = ROLES;
    let selectedAnnotationRole = selectedBlock ? selectedBlock.role as string : rolesList[0].value;
    if (!selectedBlock && annotationSuggestions.role) {
      selectedAnnotationRole = annotationSuggestions.role;
    }

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

  handleOnSelect(key: string, value?: string) {
    const fields = { ...this.state.fields };
    fields[key as keyof AnnotationFields] = value;
    this.setState({ fields });
  }

  renderSearchResults() {
    const { showResult1 } = this.state
    return (
      <div>
        {
          showResult1 ?
            <SearchResults onSelect={this.handleOnSelect.bind(this)} />
            : null
        }
      </div>
    )
  }

  clearSubject() {
    const subject = { ...this.state.subject };
    const fields = { ...this.state.fields };
    fields.subject = undefined;
    subject.value = '';
    this.setState({
      subject: subject,
      fields: fields,
      showResult2: false
    });
  }

  clearInstanceOfSearch() {
    const subject = { ...this.state.subject };
    subject.instanceOfSearch = '';
    this.setState({
      subject: subject,
      showResult2: false
    });
  }

  async SearchSubject(key: string, value?: string, instanceOf?: QNode) {
    if (!value) { return; }

    const isClass = key === 'instanceOfSearch';
    try {
      await this.requestService.call(this, () => (
        this.requestService.getQNodes(value, isClass, instanceOf, false, true) // searchProperties=false, isSubject=true
      ));
    } catch (error) {
      error.errorDescription += `\nWasn't able to find any qnodes for ${value}`;
      this.setState({ errorMessage: error });
    } finally {
      console.log('qnodes request finished');
    }


  }

  handleOnFocusSubject() {
    const { value, instanceOf } = this.state.subject;
    if (!value || value === this.state.fields.subject) { return; }

    this.SearchSubject("subject", value, instanceOf)
  }

  updateSubjectQNodes(qnodes: QNode[]) {
    this.setState({ showResult1: false, showResult2: true })
    const subject = { ...this.state.subject };
    subject.qnodes = qnodes;
    this.setState({ subject: subject });
  }

  handleOnClickQnode(qnode: QNode) {
    const subject = { ...this.state.subject };
    console.log(subject);
    subject.qnodes = [];
    if (subject.instanceOfSearch) {
      subject.instanceOfSearch = '';
      subject.instanceOf = qnode;
      this.handleOnSelect("subject", undefined)
      subject.value = "";
      subject.selected = undefined;
    } else {
      this.handleOnSelect("subject", qnode.id)
      subject.value = qnode.id;
      subject.selected = qnode;
    }
    this.setState({ subject: subject, showResult2: false });
  }

  handleOnChangeSubject(event: any) {
    const value: string = (event.target as HTMLInputElement).value;
    const subject = { ...this.state.subject };
    subject.value = value;
    this.changed = true;
    this.setState({ subject: subject }, () => {

      if (!value) {
        this.clearSubject();
      } else {
        if (this.timeoutId) {
          window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          if (subject.value && subject.value == this.state.fields.subject) { return; }
          this.SearchSubject('subject', value, subject.instanceOf);
        }, 300);
      }
    });
  }

  handleOnChangeInstanceOfSearch(event: any) {
    const value: string = (event.target as HTMLInputElement).value;
    this.changed = true;
    const subject = { ...this.state.subject };
    subject.instanceOfSearch = value;
    this.setState({ subject: subject }, () => {
      if (!value) {
        this.clearInstanceOfSearch();
      } else {
        if (this.timeoutId) {
          window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          this.SearchSubject('instanceOfSearch', value);
        }, 300);
      }
    });
  }

  async handleOnWikify() {
    const data = { "selection": this.state.selection };
    wikiStore.table.showSpinner = true;
    try {
      await this.requestService.call(this, () => (
        this.requestService.callWikifierService(data)
      ));
    }
    finally {
      wikiStore.table.showSpinner = false;
    }
  }

  removeInstanceOf() {
    const subject = { ...this.state.subject };
    subject.instanceOf = undefined;
    this.setState({
      subject: subject,
    }, () => {
      this.SearchSubject('subject', subject.value);
    });
  }

  renderSubjectQNodeResults() {
    const { qnodes } = this.state.subject;
    if (qnodes.length) {
      return (
        <div className="results-subject">
          {qnodes.map((item, index) => (
            <Row className={"qnode"} key={index}
              onClick={() => this.handleOnClickQnode(item)}>
              <Col sm="12" md="12">
                <div className="label">{item.label} ({item.id})</div>
                <div className="description">{item.description}</div>
              </Col>
            </Row>
          ))}
        </div>
      )
    }
  }

  renderSelectedSubjectNode() {
    const { qnodes, selected } = this.state.subject;
    if (!qnodes.length && selected) {
      return (
        <div className="selected-node">
          <strong>{selected.label}</strong>&nbsp;
          <a target="_blank"
            rel="noopener noreferrer"
            className="type-qnode"
            href={`https://www.wikidata.org/wiki/${selected.id}`}>
            {selected.id}
          </a>
          <br />
          {selected.description}
        </div>
      )
    }
  }

  renderSubject() {
    const { value, instanceOfSearch, instanceOf, qnodes } = this.state.subject;
    if (this.state.fields?.role != 'dependentVar') { return null; }
    const { selectedBlock } = this.state;
    const subjectBlockId = selectedBlock?.links?.mainSubject;
    let subjectBlockSelection = "";
    if (subjectBlockId) {
      for (const block of wikiStore.annotations.blocks) {
        if (block.id == subjectBlockId) {
          const { x1, x2, y1, y2 } = block.selection;
          subjectBlockSelection = `${columnToLetter(x1)}${y1}` + ":" + `${columnToLetter(x2)}${y2}`
        }
      }
    }
    return (
      <div>
        <Form.Group as={Row}>
          <Col sm="12" md={subjectBlockSelection ? '6' : '8'}>
            <Form.Label className="text-muted">Subject</Form.Label>
            <Form.Control
              type="text" size="sm"
              placeholder='qnode'
              value={value}
              onFocus={this.handleOnFocusSubject.bind(this)}
              onChange={(event: any) => this.handleOnChangeSubject(event)}
            />
            {value && qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearSubject.bind(this)} />
            ) : null}
          </Col>
          <Col sm="12" md={subjectBlockSelection ? '3' : '4'}>
            <Form.Label className="text-muted">Instance Of</Form.Label>
            <Form.Control
              type="text" size="sm"
              placeholder="qnode"
              value={instanceOfSearch}
              onChange={(event: any) => {
                this.handleOnChangeInstanceOfSearch(event)
              }} />
            {instanceOfSearch && qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearInstanceOfSearch.bind(this)} />
            ) : null}
          </Col>
          {
            subjectBlockSelection ?
              <Col sm="12" md='3'>
                <Form.Label className="text-muted">Sheet link</Form.Label>
                <Form.Control
                  type="text" size="sm"
                  value={subjectBlockSelection}
                  readOnly />
              </Col> : null
          }

        </Form.Group>
        {instanceOf ? (
          <div className="instance-of">
            Results shown are limited to instances of <strong>{instanceOf.label} ({instanceOf.id})</strong>
            <span className="remove-instance-of-button"
              onClick={this.removeInstanceOf.bind(this)}>Remove</span>
          </div>
        ) : null}
        {
          this.state.showResult2 ?
            this.renderSubjectQNodeResults()
            : null
        }
        {this.renderSelectedSubjectNode()}
      </div>
    )
  }

  renderWikifyButton() {
    const { role, type } = this.state.fields;
    if (role === 'unit' || role === 'mainSubject' || type === 'wikibaseitem') {
      return (<Button
        size="sm"
        type="button"
        variant="outline-dark"
        onClick={() => this.handleOnWikify()}>
        Send this block for wikification
      </Button>)
    }
  }

  renderSubmitButton() {
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          {this.renderWikifyButton()}
        </Col>
        <Col sm="12" md="12" style={{ marginTop: "0.5rem" }}>
          <Button
            size="sm"
            type="submit"
            variant="outline-dark">
            Submit
          </Button>
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
          variant="link"
          className="delete"
          onClick={(event: React.MouseEvent) => this.handleOnDelete(event)}>
          delete this annotation block
        </Button>
      )
    }
  }

  render() {
    const { selection } = this.state;
    const { showEntityMenu, typeEntityMenu } = this.state;
    if (currentFilesService.currentState.mappingType == "Yaml") { return <div>Block mode not relevant when working with a yaml file</div> }
    if (!selection) { return <div>Please select a block</div>; }
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        {this.renderSelectionAreas()}
        {this.renderRolesDropdown()}
        {this.renderNestedOptions()}
        {this.renderSearchResults()}
        {this.renderSubject()}
        {this.renderSubmitButton()}

        {
          showEntityMenu && selection ?
            <EntityMenu
              selection={selection}
              onClose={(entityFields?: EntityFields) => this.handleOnCloseEntityMenu(entityFields)}
              title={typeEntityMenu}
            />
            : null
        }

      </Form>
    )
  }
}


export default AnnotationForm;
