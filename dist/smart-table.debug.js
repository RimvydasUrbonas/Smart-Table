(function (ng, undefined){
    'use strict';
    ng.module('smart-table', []).run(['$templateCache', function ($templateCache) {
        $templateCache.put('template/smart-table/pagination.html',
            '<div class="pagination" ng-if="pages.length >= 2"><ul class="pagination">' +
            '<li ng-repeat="page in pages" ng-class="{active: page==currentPage}"><a ng-click="selectPage(page)">{{page}}</a></li>' +
            '</ul></div>');
    }]);

    ng.module('smart-table')
    .provider('smartTableConfig', function () {
        var config = {
            selectedRowClass: 'st-selected',
            notSelectableCol: 'st-not-selectable',
            defaultEditResolution: 'reject',
            rowEditMode: 'single'
        };
        var emptyController = function () { };

        function stringSetter(setting, value) {
            if (typeof value === 'string') {
                config[setting] = value;
            }
        }

        function controllerSetter(setting, value) {
            if (value && (ng.isString(value) && value.length || ng.isFunction(value) || ng.isArray(value))) {
                config[setting] = value;
            } else {
                config[setting] = emptyController;
            }
        }

        function numberSetter(setting, value) {
            if (typeof value === 'number') {
                config[setting] = value;
            }
        }

        var setters = {
            'selectedRowClass': stringSetter,
            'notSelectableCol': stringSetter,
            'defaultEditResolution': stringSetter,
            'rowEditMode': stringSetter
        };

        this.$get = function () {
            return config;
        };

        this.set = function (name, value) {
            var fn, key, props, i;
            if (typeof name === 'string') {
                fn = setters[name];
                if (fn) {
                    fn(name, value);
                }
            } else if (typeof name === 'object') {
                props = Object.keys(name);
                for (i = 0; i < props.length; ++i) {
                    key = props[i];
                    fn = setters[key];
                    if (fn) {
                        fn(key, name[key]);
                    }
                }
            }
        };
    })
    .controller('stTableController', ['$scope', '$parse', '$filter', '$attrs', function StTableController($scope, $parse, $filter, $attrs) {
        var propertyName = $attrs.stTable;
        var displayGetter = $parse(propertyName);
        var displaySetter = displayGetter.assign;
        var safeGetter;
        var orderBy = $filter('orderBy');
        var filter = $filter('filter');
        var safeCopy = copyRefs(displayGetter($scope));
        var tableState = {
            sort: {},
            search: {},
            pagination: {
                start: 0
            }
        };
        var pipeAfterSafeCopy = true;
        var ctrl = this;
        var lastSelected;

        function copyRefs(src) {
            return [].concat(src);
        }

        function updateSafeCopy() {
            safeCopy = copyRefs(safeGetter($scope));
            if (pipeAfterSafeCopy === true) {
                ctrl.pipe();
            }
        }

        if ($attrs.stSafeSrc) {
            safeGetter = $parse($attrs.stSafeSrc);
            $scope.$watch(function () {
                var safeSrc = safeGetter($scope);
                return safeSrc ? safeSrc.length : 0;

            }, function (newValue, oldValue) {
                if (newValue !== safeCopy.length) {
                    updateSafeCopy();
                }
            });
            $scope.$watch(function () {
                return safeGetter($scope);
            }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    updateSafeCopy();
                }
            });
        }

        /**
         * sort the rows
         * @param {Function | String} predicate - function or string which will be used as predicate for the sorting
         * @param {boolean} [reverse] - if you want to reverse the order
         */
        this.sortBy = function sortBy(predicate, reverse) {
            tableState.sort.predicate = predicate;
            tableState.sort.reverse = reverse === true;
            tableState.pagination.start = 0;
            this.pipe();
        };

        /**
         * search matching rows
         * @param {String} input - the input string
         * @param {String} [predicate] - the property name against you want to check the match, otherwise it will search on all properties
         */
        this.search = function search(input, predicate) {
            var predicateObject = tableState.search.predicateObject || {};
            var prop = predicate ? predicate : '$';
            predicateObject[prop] = input;
            // to avoid to filter out null value
            if (!input) {
                delete predicateObject[prop];
            }
            tableState.search.predicateObject = predicateObject;
            tableState.pagination.start = 0;
            this.pipe();
        };

        /**
         * this will chain the operations of sorting and filtering based on the current table state (sort options, filtering, ect)
         */
        this.pipe = function pipe() {
            var pagination = tableState.pagination;
            var filtered = tableState.search.predicateObject ? filter(safeCopy, tableState.search.predicateObject) : safeCopy;
            if (tableState.sort.predicate) {
                filtered = orderBy(filtered, tableState.sort.predicate, tableState.sort.reverse);
            }
            if (pagination.number !== undefined) {
                pagination.numberOfPages = filtered.length > 0 ? Math.ceil(filtered.length / pagination.number) : 1;
                pagination.start = pagination.start >= filtered.length ? (pagination.numberOfPages - 1) * pagination.number : pagination.start;
                filtered = filtered.slice(pagination.start, pagination.start + pagination.number);
            }
            displaySetter($scope, filtered);
        };

        /**
         * select a dataRow (it will add the attribute isSelected to the row object)
         * @param {Object} row - the row to select
         * @param {String} [mode] - "single" or "multiple" (multiple by default)
         */
        this.select = function select(row, mode) {
            var rows = safeCopy;
            var index = rows.indexOf(row);
            if (index !== -1) {
                if (mode === 'single') {
                    row.isSelected = row.isSelected !== true;
                    if (lastSelected) {
                        lastSelected.isSelected = false;
                    }
                    lastSelected = row.isSelected === true ? row : undefined;
                } else {
                    rows[index].isSelected = !rows[index].isSelected;
                }
            }
        };

        /**
         * take a slice of the current sorted/filtered collection (pagination)
         *
         * @param {Number} start - start index of the slice
         * @param {Number} number - the number of item in the slice
         */
        this.slice = function splice(start, number) {
            tableState.pagination.start = start;
            tableState.pagination.number = number;
            this.pipe();
        };

        /**
         * return the current state of the table
         * @returns {{sort: {}, search: {}, pagination: {start: number}}}
         */
        this.tableState = function getTableState() {
            return tableState;
        };

        /**
         * Use a different filter function than the angular FilterFilter
         * @param {String} filterName the name under which the custom filter is registered
         */
        this.setFilterFunction = function setFilterFunction(filterName) {
            filter = $filter(filterName);
        };

        /**
         *User a different function than the angular orderBy
         * @param {String} sortFunctionName the name under which the custom order function is registered
         */
        this.setSortFunction = function setSortFunction(sortFunctionName) {
            orderBy = $filter(sortFunctionName);
        };

        /**
         * Usually when the safe copy is updated the pipe function is called.
         * Calling this method will prevent it, which is something required when using a custom pipe function
         */
        this.preventPipeOnWatch = function preventPipe() {
            pipeAfterSafeCopy = false;
        };

        this.find = function (expression) {
            var rows = safeCopy;
            return $filter('filter')(rows, expression);
        };
    }])
    .directive('stTable', function () {
        return {
            restrict: 'A',
            controller: 'stTableController',
            link: function (scope, element, attr, ctrl) {

                if (attr.stSetFilter) {
                    ctrl.setFilterFunction(attr.stSetFilter);
                }

                if (attr.stSetSort) {
                    ctrl.setSortFunction(attr.stSetSort);
                }
            }
        };
    });

    ng.module('smart-table')
        .directive('stSearch', ['$timeout', function ($timeout) {
            return {
                require: '^stTable',
                scope: {
                    predicate: '=?stSearch'
                },
                link: function (scope, element, attr, ctrl) {
                    var tableCtrl = ctrl;
                    var promise = null;
                    var throttle = attr.stDelay || 400;

                    scope.$watch('predicate', function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            ctrl.tableState().search = {};
                            tableCtrl.search(element[0].value || '', newValue);
                        }
                    });

                    //table state -> view
                    scope.$watch(function () {
                        return ctrl.tableState().search;
                    }, function (newValue, oldValue) {
                        var predicateExpression = scope.predicate || '$';
                        if (newValue.predicateObject && newValue.predicateObject[predicateExpression] !== element[0].value) {
                            element[0].value = newValue.predicateObject[predicateExpression] || '';
                        }
                    }, true);

                    // view -> table state
                    element.bind('input', function (evt) {
                        evt = evt.originalEvent || evt;
                        if (promise !== null) {
                            $timeout.cancel(promise);
                        }
                        promise = $timeout(function () {
                            tableCtrl.search(evt.target.value, scope.predicate || '');
                            promise = null;
                        }, throttle);
                    });
                }
            };
        }]);

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

                    element.find('td:not(.' + smartTableConfig.notSelectableCol + ')').bind('click', function () {
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

    ng.module('smart-table')
        .directive('stSort', ['$parse', function ($parse) {
            return {
                restrict: 'A',
                require: '^stTable',
                link: function (scope, element, attr, ctrl) {

                    var predicate = attr.stSort;
                    var getter = $parse(predicate);
                    var index = 0;
                    var classAscent = attr.stClassAscent || 'st-sort-ascent';
                    var classDescent = attr.stClassDescent || 'st-sort-descent';
                    var stateClasses = [classAscent, classDescent];

                    //view --> table state
                    function sort() {
                        index++;
                        if (index % 3 === 0 && attr.stSkipNatural === undefined) {
                            //manual reset
                            index = 0;
                            ctrl.tableState().sort = {};
                            ctrl.tableState().pagination.start = 0;
                            ctrl.pipe();
                        } else {
                            ctrl.sortBy(predicate, index % 2 === 0);
                        }
                    }

                    if (ng.isFunction(getter(scope))) {
                        predicate = getter(scope);
                    }

                    element.bind('click', function sortClick() {
                        if (predicate) {
                            scope.$apply(sort);
                        }
                    });

                    if (attr.stSortDefault !== undefined) {
                        index = attr.stSortDefault === 'reverse' ? 1 : 0;
                        sort();
                    }

                    //table state --> view
                    scope.$watch(function () {
                        return ctrl.tableState().sort;
                    }, function (newValue) {
                        if (newValue.predicate !== predicate) {
                            index = 0;
                            element
                                .removeClass(classAscent)
                                .removeClass(classDescent);
                        } else {
                            index = newValue.reverse === true ? 2 : 1;
                            element
                                .removeClass(stateClasses[index % 2])
                                .addClass(stateClasses[index - 1]);
                        }
                    }, true);
                }
            };
        }]);

    ng.module('smart-table')
        .directive('stPagination', function () {
            return {
                restrict: 'EA',
                require: '^stTable',
                scope: {
                    stItemsByPage: '=?',
                    stDisplayedPages: '=?'
                },
                templateUrl: 'template/smart-table/pagination.html',
                link: function (scope, element, attrs, ctrl) {

                    scope.stItemsByPage = scope.stItemsByPage ? +(scope.stItemsByPage) : 10;
                    scope.stDisplayedPages = scope.stDisplayedPages ? +(scope.stDisplayedPages) : 5;

                    scope.currentPage = 1;
                    scope.pages = [];

                    function redraw() {
                        var paginationState = ctrl.tableState().pagination;
                        var start = 1;
                        var end;
                        var i;
                        scope.currentPage = Math.floor(paginationState.start / paginationState.number) + 1;

                        start = Math.max(start, scope.currentPage - Math.abs(Math.floor(scope.stDisplayedPages / 2)));
                        end = start + scope.stDisplayedPages;

                        if (end > paginationState.numberOfPages) {
                            end = paginationState.numberOfPages + 1;
                            start = Math.max(1, end - scope.stDisplayedPages);
                        }

                        scope.pages = [];
                        scope.numPages = paginationState.numberOfPages;

                        for (i = start; i < end; i++) {
                            scope.pages.push(i);
                        }
                    }

                    //table state --> view
                    scope.$watch(function () {
                        return ctrl.tableState().pagination;
                    }, redraw, true);

                    //scope --> table state  (--> view)
                    scope.$watch('stItemsByPage', function () {
                        scope.selectPage(1);
                    });

                    scope.$watch('stDisplayedPages', redraw);

                    //view -> table state
                    scope.selectPage = function (page) {
                        if (page > 0 && page <= scope.numPages) {
                            ctrl.slice((page - 1) * scope.stItemsByPage, scope.stItemsByPage);
                        }
                    };

                    //select the first page
                    ctrl.slice(0, scope.stItemsByPage);
                }
            };
        });

    ng.module('smart-table')
        .directive('stPipe', function () {
            return {
                require: 'stTable',
                scope: {
                    stPipe: '='
                },
                link: {
                    pre: function (scope, element, attrs, ctrl) {

                        if (ng.isFunction(scope.stPipe)) {
                            ctrl.preventPipeOnWatch();
                            ctrl.pipe = function () {
                                scope.stPipe(ctrl.tableState(), ctrl);
                            };
                        }
                    }
                }
            };
        });

    ng.module('smart-table')
    .directive('stEditableRow', ['$parse', '$timeout', 'smartTableConfig', function ($parse, $timeout, smartTableConfig) {
        return {
            restrict: 'A',
            require: ['form', '^stTable'],
            transclude: true,
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
                var mode = attrs.stSelectMode || 'single';
                var onSelected = null;
                var beforeSelected = null;
                var editMode = smartTableConfig.rowEditMode;
                var defaultEditResolution = smartTableConfig.defaultEditResolution;
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

                element.find('td:not(.' + smartTableConfig.notSelectableCol + ')').bind('click', function () {
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
                        element.addClass(smartTableConfig.selectedRowClass);
                    } else {
                        element.removeClass(smartTableConfig.selectedRowClass);
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
})(angular);