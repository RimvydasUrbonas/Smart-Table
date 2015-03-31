ng.module('smart-table')
  .constant('stConfig', {
    pagination: {
      template: 'template/smart-table/pagination.html',
      itemsByPage: 10,
      displayedPages: 5
    },
    search: {
      delay: 400 // ms
    },
    select: {
      mode: 'single',
      selectedClass: 'st-selected',
      notSelectableColClass: 'st-not-selectable'
    },
    sort: {
      ascentClass: 'st-sort-ascent',
      descentClass: 'st-sort-descent'
    },
    edit: {
        defaultEditResolution: 'save',
        rowEditMode: 'single'
    }
  });