ng.module('smart-table')
.directive('stEditableRow', ['$parse', '$timeout', 'stConfig', function ($parse, $timeout, stConfig) {
    return {
        restrict: 'A',
        require: ['form', '^stTable'],
        transclude: true,
        scope: true,
        link: function (scope, element, attrs, ctrl, transclude) {
            var mode = attrs.stSelectMode || 'single';
            var onSelected = null;
            var beforeSelected = null;
            var editMode = stConfig.edit.rowEditMode;
            var defaultEditResolution = stConfig.edit.defaultEditResolution;
            scope.form = ctrl[0];
            var tableController = ctrl[1];

            var deleteFn = $parse(attrs.stEditableDelete)(scope.$parent);
            var saveFn = $parse(attrs.stEditableSave)(scope.$parent);

            var isNewRowGetter = $parse(attrs.isNewRow);
            var isNewRowSetter = isNewRowGetter.assign;

            var rowGetter = $parse(attrs.stEditableRow);
            var rowSetter = rowGetter.assign;

            var isNewRowEditor = attrs.isNewRow !== undefined;
            var newRowMasterRecord = null;
            var masterRecord = {};

            if (isNewRowEditor) {
                // If new row copy from parent if exists
                newRowMasterRecord = rowGetter(scope.$parent);
                if (newRowMasterRecord) {
                    scope.$row = ng.copy(newRowMasterRecord);
                } else {
                    scope.$row = newRowMasterRecord = {};
                }
            } else { //Else assign
                scope.$row = rowGetter(scope.$parent);
            }

            function focusFirst(selector) {
                var inputElement = element.find(selector);
                if (inputElement.length > 0) {
                    var elm = ng.element(inputElement[0]);
                    elm.focus();
                }
            }

            function focusFirstError() {
                focusFirst('input.ng-invalid,textarea.ng-invalid,select.ng-invalid');
            }

            function focusFormElement() {
                focusFirst('input,textarea,select');
            }

            function selectRow(row) {
                tableController.select(row, mode);
                if (onSelected) {
                    onSelected(row);
                }
            }

            transclude(scope, function (clone) {
                element.append(clone);
            });

            attrs.$observe('stOnSelected', function (value) {
                onSelected = scope.$parent.$eval(value);
            });

            attrs.$observe('stBeforeSelected', function (value) {
                beforeSelected = scope.$parent.$eval(value);
            });

            element.find('td:not(.' + stConfig.select.notSelectableColClass + ')').bind('click', function () {
                scope.$apply(function () {
                    if (ng.isFunction(beforeSelected)) {
                        beforeSelected(scope.$row, tableController).then(function () {
                            selectRow(scope.$row);
                        });
                    } else {
                        selectRow(scope.$row);
                    }

                });
            });

            scope.$watch('$row.isSelected', function (newValue, oldValue) {
                if (newValue === true) {
                    element.addClass(stConfig.select.selectedClass);
                } else {
                    element.removeClass(stConfig.select.selectedClass);
                }
            });

            scope.$watch(function () {
                if (ng.isFunction(isNewRowGetter)) {
                    return isNewRowGetter(scope.$parent);
                } else {
                    return false;
                }
            }, function (newValue, oldValue) {
                scope.$newRowVisible = newValue;
            });

            scope.$watch('$newRowVisible', function (newValue, oldValue) {
                if (ng.isFunction(isNewRowSetter)) {
                    isNewRowSetter(scope.$parent, newValue);
                }
                if (newValue !== undefined) {
                    if (newValue) {
                        $timeout(function () {
                            focusFormElement();
                        }, 10);
                    } else {
                        scope.$row = ng.copy(newRowMasterRecord);
                        scope.form.$attempted = false;
                        scope.form.$setPristine();
                    }
                }

            });

            scope.$save = function () {
                scope.form.$attempted = true;
                if (scope.form.$valid) {
                    if (scope.$row) {
                        if (ng.isFunction(saveFn)) {
                            saveFn(scope.$row);
                        }
                        scope.$row.$edit = false;

                        masterRecord = {};
                        tableController.lastEditRowScope = null;
                        scope.form.$attempted = false;
                    }
                } else {
                    focusFirstError();
                }
            };

            scope.$delete = function () {
                if (scope.$row && ng.isFunction(saveFn)) {
                    deleteFn(scope.$row);
                }
            };

            scope.$reject = function () {
                if (isNewRowEditor) {
                    scope.$newRowVisible = false;
                    scope.$row = null;
                    scope.form.$attempted = false;
                    scope.form.$setPristine();
                } else if (masterRecord) {
                    ng.copy(masterRecord, scope.$row);
                    tableController.lastEditRowScope = null;
                }
            };

            scope.$insert = function () {

                scope.form.$attempted = true;
                if (scope.form.$valid) {
                    if (scope.$row) {
                        if (ng.isFunction(saveFn)) {
                            saveFn(scope.$row);
                        }
                        scope.$newRowVisible = false;
                    }
                } else {
                    focusFirstError();
                }
            };

            scope.$toggleEdit = function () {
                if (tableController.lastEditRowScope && tableController.lastEditRowScope != scope) {
                    if (editMode == 'single') {
                        if (defaultEditResolution == 'save') {
                            tableController.lastEditRowScope.$save();
                        } else if (defaultEditResolution == 'reject') {
                            tableController.lastEditRowScope.$reject();
                        }
                        tableController.lastEditRowScope = null;
                    }
                }

                if (scope.$row.$edit) {
                    scope.$reject();
                } else {
                    ng.copy(scope.$row, masterRecord);

                    tableController.lastEditRowScope = scope;

                    scope.$row.$edit = true;

                    $timeout(function () {
                        focusFormElement();
                    }, 10);

                }

            };
        }
    };
}]);