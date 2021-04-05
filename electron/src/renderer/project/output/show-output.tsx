import React, { Component } from 'react';

// App
import { Card } from 'react-bootstrap';


import { observer } from "mobx-react";
import { StatementEntry } from '@/renderer/common/dtos';
import wikiStore from '@/renderer/data/store';

interface ShowOutputProperties {
  errors: string;
  statement: StatementEntry | null;
}



@observer
class ShowOutput extends Component<ShowOutputProperties, {}> {

  qNodeGetter(id: string): any {
    const node = wikiStore.layers.statement.getQNode(id)
    if (node.url != "") {
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ "color": "hsl(200, 100%, 30%)" }}
        >{node.label}</a>
      );
    }
    if (node.label != node.id) {
      return <span>{node.label} ({node.id})</span> //if we decide to get rid of this, tweak subjectParentheses below
    }
    return <span>{node.label}</span>

  }

  render() {
    const outputDiv = [];

    let errorsDiv;
    if (this.props.errors) {
      errorsDiv = <div key="errors" style={{ fontSize: "14px", fontWeight: "bold", color: 'red' }}>
        Errors: {this.props.errors}
      </div>
    }

    const statement = this.props.statement
    if (statement) {
      const subjectQNode = wikiStore.layers.statement.getQNode(statement.subject)
      let subjectParentheses= ""
      if (subjectQNode.url!= "" || subjectQNode.label==subjectQNode.id){
        subjectParentheses= "(" + subjectQNode.id + ")";

      }
      const subjectIDDiv = this.qNodeGetter(statement.subject);

      const propertyDiv = this.qNodeGetter(statement.property);
      const valuePartDiv = this.qNodeGetter(statement.value)
      let valueDiv;
      let unitDiv;
      if (statement.unit) {
        unitDiv = this.qNodeGetter(statement.unit);
        valueDiv = <span>{valuePartDiv} ({unitDiv})</span>
      } else {
        valueDiv = valuePartDiv;
      }

      // qualifiers
      const qualifiersDiv = [];
      const qualifiers = statement.qualifier;
      if (qualifiers) {
        for (let i = 0, len = qualifiers.length; i < len; i++) {
          const qualifier = qualifiers[i];

          const qualifierPropertyDiv = this.qNodeGetter(qualifier["property"]);
          const qualifierValueDiv = this.qNodeGetter(qualifier["value"]);



          // qualifier unit

          let qualifierUnitDiv;
          if (qualifier.unit) {
            qualifierUnitDiv = this.qNodeGetter(qualifier["unit"]);
          } else {
            qualifierUnitDiv = ""
          }

          // append to qualifiersDiv
          qualifiersDiv.push(
            <div key={i}>- {qualifierPropertyDiv}: {qualifierValueDiv} {qualifierUnitDiv}</div>
          );
        }
      }

      // final output
      outputDiv.push(
        <Card.Title key="subject">
          <span style={{ fontSize: "24px", fontWeight: "bolder" }}>
            {subjectIDDiv}
          </span>
          &nbsp;
          <span style={{ fontSize: "20px" }}>
            {subjectParentheses}
          </span>
        </Card.Title>
      );
      outputDiv.push(
        <table className="w-100" key="outputTable" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderTop: "1px solid lightgray", borderBottom: "1px solid lightgray" }}>
              <td className="p-2" style={{ fontSize: "16px", fontWeight: "bold", verticalAlign: "top", width: "40%" }}>
                {propertyDiv}
              </td>
              <td className="p-2">
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {valueDiv}
                </div>
                <div style={{ fontSize: "14px" }}>
                  {qualifiersDiv}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );

    }

    outputDiv.push(errorsDiv);

    return outputDiv;
  }
}

export default ShowOutput;
