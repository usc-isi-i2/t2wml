import React, { Component } from 'react';

// App
import { Card } from 'react-bootstrap';


import { observer } from "mobx-react";

interface ShowOutputProperties {
    errors: string;
    itemName: string | null;
    itemID: string | null;
    propertyID: string | null;
    propertyName: string | null;
    value: string | null;
    qualifiers: any; 
}



@observer
class ShowOutput extends Component<ShowOutputProperties, {}> {

  render() {
    let outputDiv = [];

    let errorsDiv;
    if (this.props.errors) {
        errorsDiv = <div key="erros" style={{ fontSize: "14px", fontWeight: "bold", color: 'red' }}>
            Errors: {this.props.errors}
        </div>
    }

    let itemName = this.props.itemName;
    if (itemName) {

      // item
      let itemID = this.props.itemID;
      let itemIDDiv = (
        <a
          href={"https://www.wikidata.org/wiki/" + itemID}
          target="_blank"
          rel="noopener noreferrer"
          style={{ "color": "hsl(200, 100%, 30%)" }}
        >{itemID}</a>
      );

      // property
      let propertyDiv;
      let propertyID = this.props.propertyID;
      let propertyName = this.props.propertyName;
      if (propertyName) {
        propertyDiv =
          <span key="property">
            <a
              href={"https://www.wikidata.org/wiki/Property:" + propertyID}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "color": "hsl(200, 100%, 30%)" }}
            >{propertyName}</a>
          </span>
          ;
      } else {
        propertyDiv =
          <span key="property">
            <a
              href={"https://www.wikidata.org/wiki/Property:" + propertyID}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "color": "hsl(200, 100%, 30%)" }}
            >{propertyID}</a>
          </span>
          ;
      }

      // value
      let valueDiv = this.props.value;

      // qualifiers
      let qualifiersDiv = [];
      let qualifiers = this.props.qualifiers;
      if (qualifiers) {
        for (let i = 0, len = qualifiers.length; i < len; i++) {
          let qualifier = qualifiers[i];

          // qualifier property
          let qualifierPropertyDiv;
          let qualifierPropertyID = qualifier["propertyID"];
          let qualifierPropertyName = qualifier["propertyName"];
          if (qualifierPropertyName) {
            qualifierPropertyDiv =
              <a
                href={"https://www.wikidata.org/wiki/Property:" + qualifierPropertyID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyName}</a>
              ;
          } else {
            qualifierPropertyDiv =
              <a
                href={"https://www.wikidata.org/wiki/Property:" + qualifierPropertyID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyID}</a>
              ;
          }

          // qualifier value
          let qualifierValueDiv;
          let qualifierValueID = qualifier["valueID"];
          let qualifierValueName = qualifier["valueName"];
          if (qualifierValueID) {
            qualifierValueDiv =
              <a
                href={"https://www.wikidata.org/wiki/" + qualifierValueID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierValue"
              >{qualifierValueName}</a>
              ;
          } else {
            qualifierValueDiv = qualifierValueName;
          }

          // append to qualifiersDiv
          qualifiersDiv.push(
            <div key={i}>- {qualifierPropertyDiv}: {qualifierValueDiv}</div>
          );
        }
      }

      // final output
      outputDiv.push(
        <Card.Title key="item">
          <span style={{ fontSize: "24px", fontWeight: "bolder" }}>
            {itemName}
          </span>
          &nbsp;
          <span style={{ fontSize: "20px" }}>
            ({itemIDDiv})
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
