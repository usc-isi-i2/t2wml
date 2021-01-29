export const TYPES = [{
  'label': 'String',
  'value': 'string',
  'children': [{
    'label': 'Property',
    'value': 'property',
  }],
}, {
  'label': 'Monolingual String',
  'value': 'monolingualtext',
  'children': [{
    'label': 'Language',
    'value': 'language',
  }, {
    'label': 'Property',
    'value': 'property',
  }],
}, {
  'label': 'Quantity',
  'value': 'quantity',
  'children': [{
    'label': 'Unit',
    'value': 'unit',
  }, {
    'label': 'Property',
    'value': 'property',
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
  }, {
    'label': 'Property',
    'value': 'property',
  }],
}, {
  'label': 'Wikidata Item',
  'value': 'wikibaseitem',
  'children': [{
    'label': 'Property',
    'value': 'property',
  }],
}];


export const ROLES = [{
  'label': 'Dependent Variable',
  'value': 'dependentVar',
  'children': TYPES,
}, {
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
  'label': 'Metadata',
  'value': 'metadata',
}, {
  'label': 'Unit',
  'value': 'unit',
}];
