ng.module('smart-table')
    .directive('stSelectRow', ['smartTableConfig', function (smartTableConfig) {
        return {
            restrict: 'A',
            require: '^stTable',
            scope: {
                row: '=stSelectRow',
                onSelected: '&'
            },
            link: function (scope, element, attr, ctrl) {
                var mode = attr.stSelectMode || 'single';
                var onSelected = null;

                attr.$observe('onSelected', function (value) {
                    onSelected = scope.$parent.$eval(value);
                });

                element.bind('click', function () {
                    scope.$apply(function () {
                        ctrl.select(scope.row, mode);
                        if (onSelected) {
                            onSelected(scope.row);
                        }
                    });
                });

                scope.$watch('row.isSelected', function (newValue, oldValue) {
                    if (newValue === true) {
                        element.addClass(smartTableConfig.selectedRowClass);
                    } else {
                        element.removeClass(smartTableConfig.selectedRowClass);
                    }
                });
            }
        };
    }]);
