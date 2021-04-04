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
  },
  {
    'label': 'Property',
    'value': 'property',
  }],
}, {
  'label': 'Time',
  'value': 'time',
  'children': [{
    'label': 'Precision',
    'value': 'precision',
    'children': [{
      'label': 'Year',
      'value': 'year',
    }, {
      'label': 'Month',
      'value': 'month',
    }, {
      'label': 'Week',
      'value': 'week',
    }, {
      'label': 'Day',
      'value': 'day',
    }, {
      'label': 'Hour',
      'value': 'hour',
    }, {
      'label': 'Minute',
      'value': 'minute',
    }, {
      'label': 'Second',
      'value': 'second',
    }],
  }, {
    'label': 'Calendar',
    'value': 'calendar',
    'children': [{
      'label': 'Gregorian',
      'value': 'gregorian',
    }, {
      'label': 'Julian',
      'value': 'julian',
    }],
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
