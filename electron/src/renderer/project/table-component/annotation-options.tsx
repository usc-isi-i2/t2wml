export const TYPES = [{
  'label': 'String',
  'value': 'string',
}, {
  'label': 'Monolingual String',
  'value': 'monolingualString',
  'children': [{
    'label': 'Language',
    'value': 'language',
  }],
}, {
  'label': 'Quantity',
  'value': 'quantity',
  'children': [{
    'label': 'Unit',
    'value': 'unit',
  }],
}, {
  'label': 'Time',
  'value': 'time',
  'children': [{
    'label': 'Precision',
    'value': 'precision',
  }, {
    'label': 'Calendar',
    'value': 'calendar',
  }, {
    'label': 'Format',
    'value': 'format',
  }],
}, {
  'label': 'Q-Node',
  'value': 'qNode',
  'children': [{
    'label': 'ID',
    'value': 'qNodeID',
  }],
}];


export const ROLES = [{
  'label': 'Main Subject',
  'value': 'mainSubject',
}, {
  'label': 'Property',
  'value': 'property',
}, {
  'label': 'Qualifier',
  'value': 'qualifier',
  'children': TYPES,
}, {
  'label': 'Dependent Variable',
  'value': 'dependentVar',
  'children': TYPES,
}, {
  'label': 'Metadata',
  'value': 'metadata',
}, {
  'label': 'Unit',
  'value': 'unit',
}];
