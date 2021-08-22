import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';
import { observer } from "mobx-react";
import wikiStore from '@/renderer/data/store';



interface EntitiesProperties {
    selectedProperty?: string;
    handleSelectEntity: (file: string, property: string) => void;
}

@observer
class EntitiesList extends Component<EntitiesProperties, {}> {
    formArgs: any;

    constructor(props: EntitiesProperties) {
        super(props);
        this.formArgs = {};
    }

    handleSelectEntity(file: string, property: string) {
        this.props.handleSelectEntity(file, property);
    }



    render() {
        const properties = [];
        for (const f in wikiStore.entitiesData.entities) {
            for (const prop in wikiStore.entitiesData.entities[f]) {
                if (prop === "filepath") { continue; }
                properties.push(
                    <li key={prop} onClick={() => this.handleSelectEntity(f, prop)}>
                        <span style={prop === this.props.selectedProperty ? { fontWeight: 'bold' } : { fontWeight: 'normal' }}>
                            {prop}
                        </span>
                    </li>
                );
            }
        }

        if (properties.length==0){
            return <span>No custom entities found</span>
        }

        return (
            <ul>
                {properties}
            </ul>
        )
    }
}

export default EntitiesList;
