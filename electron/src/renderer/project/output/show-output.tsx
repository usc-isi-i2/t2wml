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

  render() {
    const outputDiv = [];

    let errorsDiv;
    if (this.props.errors) {
      errorsDiv = <div key="erros" style={{ fontSize: "14px", fontWeight: "bold", color: 'red' }}>
        Errors: {this.props.errors}
      </div>
    }

    const statement = this.props.statement
    if (statement) {

      const subjectQNode = wikiStore.layers.statement.getQNode(statement.subject);

      let subjectIDDiv;
      if (subjectQNode.url != "") {
        subjectIDDiv = (
          <a
            href={subjectQNode.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ "color": "hsl(200, 100%, 30%)" }}
          >{subjectQNode.id}</a>
        );
      }
      else{
        subjectIDDiv = <span>{statement.subject}</span>;
      }

      const propertyQNode = wikiStore.layers.statement.getQNode(statement.property);

      let propertyDiv = <span>{propertyQNode.label}</span>
      if (propertyQNode.url != "") {
        propertyDiv = (
          <a
            href={propertyQNode.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ "color": "hsl(200, 100%, 30%)" }}
          >{propertyQNode.label}</a>
        );
      }

      let valueDiv;
      if (statement.unit) {
        const unitQNode = wikiStore.layers.statement.getQNode(statement.unit);
        if (unitQNode.url!= ""){
        valueDiv = <span>{statement.value}
          <a
            href={unitQNode.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ "color": "hsl(200, 100%, 30%)" }}
            key="unit"
          > {unitQNode.label}</a></span>;
        }else{
          valueDiv = <span>{statement.value} {unitQNode.label}</span>;
        }
      }
      else {
        valueDiv = <span>{statement.value}</span>;
      }
      // qualifiers
      const qualifiersDiv = [];
      const qualifiers = statement.qualifier;
      if (qualifiers) {
        for (let i = 0, len = qualifiers.length; i < len; i++) {
          const qualifier = qualifiers[i];

          // qualifier property
          const qualifierPropertyQNode = wikiStore.layers.statement.getQNode(qualifier["property"]);
          let qualifierPropertyDiv = <span>{qualifierPropertyQNode.label}</span>
          if (qualifierPropertyQNode.url != "") {
            qualifierPropertyDiv =
              <a
                href={qualifierPropertyQNode.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyQNode.label}</a>
              ;
          }

          // qualifier value
          let qualifierValueDiv;
          const qualifierValueQNode = wikiStore.layers.statement.getQNode(qualifier["value"]);

          if (qualifierValueQNode.url != "") {

            qualifierValueDiv =
              <a
                href={qualifierValueQNode.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierValue"
              >{qualifierValueQNode.label}</a>
              ;
          } else {
            qualifierValueDiv = qualifierValueQNode.label;
          }

          // append to qualifiersDiv
          qualifiersDiv.push(
            <div key={i}>- {qualifierPropertyDiv}: {qualifierValueDiv}</div>
          );
        }
      }

      // final output
      outputDiv.push(
        <Card.Title key="subject">
          <span style={{ fontSize: "24px", fontWeight: "bolder" }}>
            {subjectQNode.label}
          </span>
          &nbsp;
          <span style={{ fontSize: "20px" }}>
            ({subjectIDDiv})
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

      outputDiv.push(errorsDiv);


    }

    return outputDiv;
  }
}

export default ShowOutput;
