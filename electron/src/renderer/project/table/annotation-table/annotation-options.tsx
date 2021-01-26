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
  'multiple': false,
}, {
  'label': 'Main Subject',
  'value': 'mainSubject',
  'multiple': false,
}, {
  'label': 'Property',
  'value': 'property',
  'multiple': true,
}, {
  'label': 'Qualifier',
  'value': 'qualifier',
  'children': TYPES,
  'multiple': true,
}, {
  'label': 'Metadata',
  'value': 'metadata',
  'multiple': true,
}, {
  'label': 'Unit',
  'value': 'unit',
  'multiple': true,
}];
