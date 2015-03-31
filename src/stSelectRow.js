ng.module('smart-table')
    .directive('stSelectRow', ['stConfig', function (stConfig) {
        return {
            restrict: 'A',
            require: '^stTable',
            scope: {
                row: '=stSelectRow',
                onSelected: '&'
            },
            link: function (scope, element, attr, ctrl) {
                var mode = attr.stSelectMode || stConfig.select.mode;
                var onSelected = null;

                attr.$observe('onSelected', function (value) {
                    onSelected = scope.$parent.$eval(value);
                });

                element.find('td:not(.' + stConfig.select.notSelectableColClass + ')').bind('click', function () {
                    scope.$apply(function () {
                        ctrl.select(scope.row, mode);
                        if (onSelected) {
                            onSelected(scope.row);
                        }
                    });
                });

        scope.$watch('row.isSelected', function (newValue) {
          if (newValue === true) {
            element.addClass(stConfig.select.selectedClass);
          } else {
            element.removeClass(stConfig.select.selectedClass);
          }
        });
      }
    };
  }]);
