import React, { Component } from 'react';

// App
import { Card } from 'react-bootstrap';


import { observer } from "mobx-react";
import { StatementEntry } from '@/renderer/common/dtos';
import wikiStore from '@/renderer/data/store';
import dayjs from 'dayjs';

interface ShowOutputProperties {
  statement?: StatementEntry;
}


function ordinal_suffix_of(i: number): string {
  const j = i % 10,
        k = i % 100;
        
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}


@observer
class ShowOutput extends Component<ShowOutputProperties, {}> {

  dateParser(precision: number, date: string): string {
    const dayFormatter = dayjs(date)
    switch (precision) {
      case 0:
        { return date; }
      case 1:
        { return date; }
      case 2:
        { return date; }
      case 3:
        { return date; }
      case 4:
        { return date; }
      case 5:
        { return date; }
      case 6:
        { return date; }
      case 7:
        {
          const millenium = Math.floor(dayFormatter.year() / 1000) + 1;
          return ordinal_suffix_of(millenium) + " millenium";
        }
      case 8:
        {
          const century = Math.floor(dayFormatter.year() / 100) + 1;
          return ordinal_suffix_of(century) + " century";
        }
      case 9:
        { return dayFormatter.format("YYYY"); }
      case 10:
        { return dayFormatter.format("MMMM YYYY"); }
      case 11:
        { return dayFormatter.format("MMMM D, YYYY"); }
      case 12:
        { return dayFormatter.format("YYYY-MM-DD HH"); }
      case 13:
        { return dayFormatter.format("YYYY-MM-DD HH:mm"); }
      case 14:
        { return dayFormatter.format("YYYY-MM-DD HH:mm:ss"); }
      default:
        { return date; }
    }
  }

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

    const statement = this.props.statement
    if (statement) {
      const subjectQNode = wikiStore.layers.statement.getQNode(statement.subject)
      let subjectParentheses = ""
      if (subjectQNode.url != "" || subjectQNode.label == subjectQNode.id) {
        subjectParentheses = "(" + subjectQNode.id + ")";

      }
      const subjectIDDiv = this.qNodeGetter(statement.subject);
      const propertyDiv = this.qNodeGetter(statement.property);


      let value = statement.value;
      if (statement.precision != undefined) {
        value = this.dateParser(statement.precision, value);
      }

      const valuePartDiv = this.qNodeGetter(value)
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

          let value = qualifier.value;
          if (qualifier.precision != undefined) {
            value = this.dateParser(qualifier.precision, value);
          }
          const qualifierValueDiv = this.qNodeGetter(value);



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

    return outputDiv;
  }
}

export default ShowOutput;
