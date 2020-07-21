import sys
from copy import deepcopy
from collections import defaultdict
from t2wml.utils.t2wml_exceptions import T2WMLException
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.classes import ReturnClass
from t2wml.parsing.t2wml_parsing import iter_on_n_for_code, T2WMLCode
from t2wml.spreadsheets.conversions import to_excel
from t2wml.wikification.utility_functions import translate_precision_to_integer, get_property_type
from t2wml.utils.bindings import update_bindings
from t2wml.parsing.yaml_parsing import validate_yaml, Template
from t2wml.mapping.region import Region
from t2wml.utils.utilities import parse_datetime



class Node:
    def __init__(self, property=None, value=None, **kwargs):
        self.errors=defaultdict(str) 
        self.property=property
        self.value=value     
        self.__dict__.update(kwargs)
        self.validate()
        
    def validate(self):
        if self.property:
            try:
                property_type=get_property_type(self.property)            
            except Exception as e:
                self.errors["property"]+="Could not get property type "
                property_type="Not found"
        else:
            self.errors["property"]+="Missing property "
            property_type="Not found"

        if self.value:
            if property_type=="Quantity":
                try:
                    float(self.value)
                except:
                    self.errors["value"]+="Quantity type property must have numeric value "

            if property_type=="Time":
                self.validate_datetime()

        else:
            if property_type=="GlobeCoordinate":
                try:
                    test_coordinate_presence = [self.longitude, self.latitude]
                except AttributeError:
                    self.errors["value"]+="GlobeCoordinates must specify longitude and latitude or point value "
            else:
                self.errors["value"]+="Missing value field "
    
        if property_type not in ["Not found", "GlobeCoordinate", "Quantity", "Time","String", "MonolingualText", 
                                    "ExternalIdentifier", "WikibaseItem", "WikibaseProperty", "Url"]: 
            self.errors["property"]+="Unsupported property type: "+property_type
    

    def validate_datetime(self):
        try:
            additional_formats=self.__dict__.get("format", [])
            datetime_string, parsed_precision = parse_datetime(
                    self.value,
                    additional_formats= additional_formats
                    )
            self.value=datetime_string
            try:
                self.precision=translate_precision_to_integer(self.precision)
            except AttributeError:
                if parsed_precision:
                    self.precision=int(parsed_precision.value.__str__())
        except:
            self.errors["value"]+="Invalid datetime: "+str(self.value)

    def serialize(self):
        return_dict=dict(self.__dict__)
        return_dict.pop("errors")
        return return_dict

class Statement(Node):
    @property
    def has_qualifiers(self):
        try:
            test=self.qualifier
            return True
        except AttributeError:
            return False
    @property
    def has_references(self):
        try:
            test=self.reference
            return True
        except AttributeError:
            return False

    def validate(self):
        super().validate()
        try:
            item=self.item
        except AttributeError:
            self.errors["item"]+="Missing item"
        
        if self.has_qualifiers:
            qual_errors={}
            for i, q in enumerate(self.qualifier):
                node_qual=Node(q)
                self.qualifier[i]=node_qual
                if len(node_qual.errors):
                    qual_errors[i]=node_qual.errors
            if qual_errors:
                self.errors["qualifier"]=qual_errors
        
        if self.has_references:
            for i, r in enumerate(references):
                self.reference[i]=Node(r)
        
    def serialize(self):
        return_dict=super().serialize()
        if self.has_qualifiers:
            for i, q in enumerate(return_dict["qualifier"]):
                return_dict["qualifier"][i]=q.serialize()
        if self.has_references:
            for i, q in enumerate(return_dict["reference"]):
                return_dict["qualifier"][i]=q.serialize()
        return return_dict



class NodeForEval(Node):
    def __init__(self, property=None, value=None, context={}, **kwargs):
        self.context=context
        self.cells={}
        super().__init__(property, value, **kwargs)
        
    def validate(self):
        keys=list(self.__dict__.keys())
        for key in keys:
            if isinstance(self.__dict__[key], T2WMLCode):
                try:
                    entry_parsed= iter_on_n_for_code(self.__dict__[key], self.context)
                    value=entry_parsed.value
                    if value is None:
                        self.errors[key]+="Not found"
                        self.__dict__.pop(key)
                    else:
                        self.__dict__[key]=value

                    try:
                        cell=to_excel(entry_parsed.col, entry_parsed.row)
                        self.cells[key]=cell
                    except AttributeError:
                        pass
                    
                except Exception as e:
                    self.errors[key]+=str(e)
                    self.__dict__.pop(key)
        
        Node.validate(self)
    def serialize(self):
        return_dict=super().serialize()
        return_dict.pop("context")
        return_dict.pop("cells")
        cell=self.cells.get("value")
        if cell:
            return_dict["cell"]=cell
        return return_dict

class EvaluatedStatement(NodeForEval, Statement):
    def validate(self):
        try:
            item=self.item
        except AttributeError:
            self.errors["item"]+="Missing item"

        NodeForEval.validate(self)

        if self.has_qualifiers:
            qual_errors={}
            new_qualifiers=[]
            for i, q in enumerate(self.qualifier):
                node_qual=NodeForEval(context=self.context, **q)
                if len(node_qual.errors):
                    qual_errors[i]=node_qual.errors
                if node_qual.errors["property"] or node_qual.errors["value"]:
                    pass #discard qualifier
                else:
                    new_qualifiers.append(node_qual)
            if qual_errors:
                self.errors["qualifier"]=qual_errors
            self.qualifier=new_qualifiers
        
        if self.has_references:
            for i, r in enumerate(self.references):
                self.reference[i]=NodeForEval(context=self.context, **r)
    def serialize(self):
        return_dict=super().serialize()
        return_dict.pop("cell")
        cell=self.cells.get("item")
        if cell:
            return_dict["cell"]=cell
        return return_dict



        