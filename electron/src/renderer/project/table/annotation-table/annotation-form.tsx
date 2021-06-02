import React from 'react';

import { AnnotationBlock, ResponseWithSuggestion } from '../../../common/dtos';
import * as utils from '../table-utils';
import { ROLES, AnnotationOption } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { CellSelection } from '@/renderer/common/general';
import SearchResults from './search-results';
import { WikiNode } from '@/renderer/common/dtos';
import wikiStore from '../../../data/store';

import { IReactionDisposer, reaction } from 'mobx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { columnToLetter } from '../table-utils';


interface AnnotationFormProperties {
  selection?: CellSelection;
  onSelectionChange: (selection: CellSelection, role?: string) => void;
  selectedAnnotationBlock?: AnnotationBlock;
  annotationSuggestions: ResponseWithSuggestion;
  onChange: (key: string, value: string, type: string) => Promise<void>; // Use the actual function type: (arg: argType) => returnType
  onChangeSubject: (key: string, value?: string, instanceOf?: QNode) => Promise<void>;
  onDelete: () => void;
  onSubmit: (values: {[key: string]: string | undefined;}) => void;
}

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
  fields: AnnotationFields;
  showExtraFields: boolean;
  validArea: boolean;
  showResult1: boWikiNode;
  showResultWikiNodeolean;
  subject: {WikiNode
    value?: string;
    instanceOfSearch?: string;
    instanceOf?: QNode;
    qnodes: QNode[];
    selected?: QNode;
  };
}


class AnnotationForm extends React.Component<AnnotationFormProperties, AnnotationFormState> {

  private changed: boolean;
  private timeoutId?: number;
  private timeoutChangeAreaId?: number;

  constructor(props: AnnotationFormProperties) {
    super(props);

    const { selectedAnnotationBlock: selectedBlock, annotationSuggestions } = this.props;
    const instanceOf = selectedBlock?.subject ? undefined : {
      label: 'country',
      description: 'the distinct region in geography; a broad term that can include political divisions or regions associated with distinct political characteristics',
      id: 'Q6256',
      url: 'https://www.wikidata.org/wiki/Q6256'
    }
    this.state = {
      fields: {
        role: annotationSuggestions.role,
        type: annotationSuggestions.type,
        selectedArea: selectedBlock ? utils.humanReadableSelection(selectedBlock.selection) : undefined,
        ...annotationSuggestions.children,
        ...selectedBlock //override everything previous
      },
      subject: {
        value: selectedBlock?.subject ? selectedBlock?.subject : undefined,
        instanceOfSearch: undefined,
        instanceOf: instanceOf,
        qnodes: [],
      },
      validArea: true,
      showExtraFields: false,
      showResult1: false,
      showResult2: false
    };
    this.changed = false;
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.subjectQnodes.qnodes, (qnodes) => this.updateSubjectQNodes(qnodes)));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  handleOnChange(event: KeyboardEvent, key: string) {
    const { onSubmit } = this.props;
    if (event.code === 'Enter') {
      event.preventDefault();
      onSubmit({...this.state.fields});
    }

    const { onChange } = this.props;
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
        if(!type){ type = "string"; }
        onChange(key, value, type);
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
    const { onSelectionChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
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
          onSelectionChange(selection, fields.role);
        }
      }, 500);
    } else {
      this.setState({ validArea: false });
    }
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    onSubmit({...this.state.fields});
  }

  handleOnDelete(event: React.MouseEvent) {
    event.preventDefault();
    this.props.onDelete();
  }

  renderSelectionAreas() {
    const { selectedArea } = this.state.fields;
    const { selection } = this.props;
    if (!selection) { return null; }
    const defaultValue = utils.humanReadableSelection(selection);
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Selected area</Form.Label>
          <Form.Control
            required
            type="text" size="sm"
            value={selectedArea || defaultValue}
            onChange={(event: React.ChangeEvent) => this.handleOnSelectionChange(event)}
            isInvalid={!WikiNodestate.validArea} />
          <Form.Control.Feedback type="invalid">
            Please choose a valid range.
            </Form.Control.Feedback>
        </Col>
      </Form.Group>
    )
  }

  renderNestedOptionsChildren(type: any) {
    const { selectedAnnotationBlock: selectedBlock } = this.props;

    const key: string = type.label.toLowerCase();

    let defaultValue = '--';
    if (selectedBlock && (selectedBlock as any)[type.value]) {
      defaultValue = (selectedBlock as any)[type.value];
    }

    if (type.children) {
      return (
        <Form.Group as={Row} key={type.value}
          onChange={
            (event: KeyboardEvent) => this.handleOnChange(event, type.value)
          }>
          <Col sm="12" md="12">
            <Form.Label className="text-muted">{type.label}</Form.Label>
            <Form.Control size="sm" as="select" defaultValue={defaultValue}>
              <option disabled selected defaultValue="--">--</option>
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

    return (
      <Form.Group as={Row} key={type.value}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, type.value)}>
        <Col sm='12' md={(key == 'property' && propertyBlockId)
                    ||  (key == 'unit' && unitBlockId) ? '9' : '12'}>
          <Form.Label className="text-muted">{type.label}</Form.Label>
          <Form.Control
            type="text" size="sm"
            defaultValue={this.state.fields[key as keyof AnnotationFields] ? this.state.fields[key as keyof AnnotationFields] : ""}
            />

        </Col>
        {
          key == "property" && propertyBlockId ?
            <Col sm="12" md='3'>
              <Form.Label className="text-muted">Sheet link</Form.Label>
              <Form.Control
                type="text" size="sm"
                value={propertyBlockSelection}
                readOnly />
            </Col>
            : key == "unit" && unitBlockId ?
            <Col sm="12" md='3'>
              <Form.Label className="text-muted">Sheet link</Form.Label>
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
    const { selectedAnnotationBlock: selectedBlock, annotationSuggestions } = this.props;
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
      <Form.Group as={Row}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Type</Form.Label>
          <Form.Control size="sm" as="select" defaultValue={ selectedAnnotationType }>
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
      if (this.state.showExtraFields && selectedType.children.length > 1)
        return (
          <React.Fragment>
            {optionsDropdown}
            <Form.Label style={{ color: 'grey' }}
              onClick={() => { this.setState({ showExtraFields: !this.state.showExtraFields }) }}>Toggle additional fields</Form.Label>
            {selectedType?.children?.map(type => {
              return this.renderNestedOptionsChildren(type);
            })}
          </React.Fragment>
        )
      else return ( //show property field regardless of extra field toggle
        <React.Fragment>
          {optionsDropdown}
          {selectedType.children.length > 1 ? <Form.Label style={{ color: 'grey' }}
            onClick={() => { this.setState({ showExtraFields: !this.state.showExtraFields }) }}>Toggle additional fields</Form.Label> : null}
          {this.renderNestedOptionsChildren({
            'label': 'Property',
            'value': 'property',
          })}
        </React.Fragment>
      )
    }
  }

  renderOptionsDropdown() {
    const { selectedAnnotationBlock: selected, annotationSuggestions } = this.props;


    const rolesList = ROLES;

    let selectedAnnotationRole = selected ? selected.role as string : rolesList[0].value;
    if(!selected && annotationSuggestions.role){
      selectedAnnotationRole = annotationSuggestions.role;
    }

    return (
      <Form.Group as={Row}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'role')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Role</Form.Label>
          <Form.Control size="sm" as="select" defaultValue={selectedAnnotationRole}>
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
    return (
      <div>{
        this.state.showResult1 ?
          <SearchResults onSelect={this.handleOnSelect.bind(this)} />
          : null
      }

      </div>
    )
  }

  clearSubject() {
    const subject = { ...this.state.subject };
    const fields = {...this.state.fields};
    fields.subject=undefined;
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

  handleOnFocusSubject() {
    const { value, instanceOf } = this.state.subject;
    if (value && value === this.state.fields.subject) { return; }
    this.props.onChangeSubject('subject', value, instanceOf);
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

    this.setState({ subject: subject }, () => {

      if (!value) {
        this.clearSubject();
      } else {
        if (this.timeoutId) {
          window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          if (subject.value && subject.value == this.state.fields.subject) { return; }
          this.props.onChangeSubject('subject', value, subject.instanceOf);
        }, 300);
      }
    });
  }

  handleOnChangeInstanceOfSearch(event: any) {
    const value: string = (event.target as HTMLInputElement).value;
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
          this.props.onChangeSubject('instanceOfSearch', value);
        }, 300);
      }
    });
  }

  removeInstanceOf() {
    const subject = { ...this.state.subject };
    subject.instanceOf = undefined;
    this.setState({
      subject: subject,
    }, () => {
      this.props.onChangeSubject('subject', subject.value);
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

  renderSelectedNode() {
    const { qnodes, selected } = this.state.subject;
    // const { subject } = {...this.state.fields};
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
    const { selectedAnnotationBlock: selectedBlock } = this.props;
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
          <Col sm="12" md={ subjectBlockSelection ? '6' : '8'}>
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
          <Col sm="12" md={ subjectBlockSelection ? '3' : '4'}>
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
        {this.renderSelectedNode()}
      </div>
    )
  }
WikiNode
  renderSubmitButton() {
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
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
    const { selectedAnnotationBlock: selectedBlock } = this.props;
    if (selectedBlock) {
      return (
        <Button
          size="sm"
          type="button"
          variant="link"
          className="delete"WikiNode
          onClick={(event: React.MouseEvent) => this.handleOnDelete(event)}>
          delete this annotation block
        </Button>
      )
    }
  }
WikiNode
  render() {
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        {/* ref={this.containerResultRef}  */}
        {this.renderSelectionAreas()}
        {this.renderOptionsDropdown()}
        {this.renderNestedOptions()}
        {this.renderSearchResults()}
        {this.renderSubject()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}


export default AnnotationForm;
