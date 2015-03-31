/** 
* @version 2.0.1
* @license MIT
*/
(function (ng, undefined){
    'use strict';

ng.module('smart-table', []).run(['$templateCache', function ($templateCache) {
    $templateCache.put('template/smart-table/pagination.html',
        '<nav ng-if="pages.length >= 2"><ul class="pagination">' +
        '<li ng-repeat="page in pages" ng-class="{active: page==currentPage}"><a ng-click="selectPage(page)">{{page}}</a></li>' +
        '</ul></nav>');
}]);


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
ng.module('smart-table')
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
    var filtered;
        var pipeAfterSafeCopy = true;
        var ctrl = this;
        var lastSelected;

    function copyRefs (src) {
      return src ? [].concat(src) : [];
    }

    function updateSafeCopy () {
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
     * @param [reverse] - if you want to reverse the order
     */
    this.sortBy = function sortBy (predicate, reverse) {
      tableState.sort.predicate = predicate;
      tableState.sort.reverse = reverse === true;

      if (ng.isFunction(predicate)) {
        tableState.sort.functionName = predicate.name;
      } else {
        delete tableState.sort.functionName;
      }

      tableState.pagination.start = 0;
      return this.pipe();
    };

    /**
     * search matching rows
     * @param {String} input - the input string
     * @param {String} [predicate] - the property name against you want to check the match, otherwise it will search on all properties
     */
    this.search = function search (input, predicate) {
      var predicateObject = tableState.search.predicateObject || {};
      var prop = predicate ? predicate : '$';

      input = ng.isString(input) ? input.trim() : input;
      predicateObject[prop] = input;
      // to avoid to filter out null value
      if (!input) {
        delete predicateObject[prop];
      }
      tableState.search.predicateObject = predicateObject;
      tableState.pagination.start = 0;
      return this.pipe();
    };

    /**
     * this will chain the operations of sorting and filtering based on the current table state (sort options, filtering, ect)
     */
    this.pipe = function pipe () {
      var pagination = tableState.pagination;
      var output;
      filtered = tableState.search.predicateObject ? filter(safeCopy, tableState.search.predicateObject) : safeCopy;
      if (tableState.sort.predicate) {
        filtered = orderBy(filtered, tableState.sort.predicate, tableState.sort.reverse);
      }
      if (pagination.number !== undefined) {
        pagination.numberOfPages = filtered.length > 0 ? Math.ceil(filtered.length / pagination.number) : 1;
        pagination.start = pagination.start >= filtered.length ? (pagination.numberOfPages - 1) * pagination.number : pagination.start;
        output = filtered.slice(pagination.start, pagination.start + parseInt(pagination.number));
      }
      displaySetter($scope, output || filtered);
    };

    /**
     * select a dataRow (it will add the attribute isSelected to the row object)
     * @param {Object} row - the row to select
     * @param {String} [mode] - "single" or "multiple" (multiple by default)
     */
    this.select = function select (row, mode) {
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
    this.slice = function splice (start, number) {
      tableState.pagination.start = start;
      tableState.pagination.number = number;
      return this.pipe();
    };

    /**
     * return the current state of the table
     * @returns {{sort: {}, search: {}, pagination: {start: number}}}
     */
    this.tableState = function getTableState () {
      return tableState;
    };

    this.getFilteredCollection = function getFilteredCollection () {
      return filtered || safeCopy;
    };

    /**
     * Use a different filter function than the angular FilterFilter
     * @param filterName the name under which the custom filter is registered
     */
    this.setFilterFunction = function setFilterFunction (filterName) {
      filter = $filter(filterName);
    };

    /**
     * Use a different function than the angular orderBy
     * @param sortFunctionName the name under which the custom order function is registered
     */
    this.setSortFunction = function setSortFunction (sortFunctionName) {
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
  .directive('stSearch', ['stConfig', '$timeout', function (stConfig, $timeout) {
    return {
      require: '^stTable',
      link: function (scope, element, attr, ctrl) {
        var tableCtrl = ctrl;
        var promise = null;
        var throttle = attr.stDelay || stConfig.search.delay;

        attr.$observe('stSearch', function (newValue, oldValue) {
          var input = element[0].value;
          if (newValue !== oldValue && input) {
            ctrl.tableState().search = {};
            tableCtrl.search(input, newValue);
          }
        });

        //table state -> view
        scope.$watch(function () {
          return ctrl.tableState().search;
        }, function (newValue, oldValue) {
          var predicateExpression = attr.stSearch || '$';
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
            tableCtrl.search(evt.target.value, attr.stSearch || '');
            promise = null;
          }, throttle);
        });
      }
    };
  }]);

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

                element.bind('click', function () {
                    scope.$apply(function () {
                        ctrl.select(scope.row, mode);
                        if (onSelected) {
                            onSelected(scope.row);
                        }
                    });
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

ng.module('smart-table')
  .directive('stSort', ['stConfig', '$parse', function (stConfig, $parse) {
    return {
      restrict: 'A',
      require: '^stTable',
      link: function (scope, element, attr, ctrl) {

        var predicate = attr.stSort;
        var getter = $parse(predicate);
        var index = 0;
        var classAscent = attr.stClassAscent || stConfig.sort.ascentClass;
        var classDescent = attr.stClassDescent || stConfig.sort.descentClass;
        var stateClasses = [classAscent, classDescent];
        var sortDefault;

        if (attr.stSortDefault) {
          sortDefault = scope.$eval(attr.stSortDefault) !== undefined ? scope.$eval(attr.stSortDefault) : attr.stSortDefault;
        }

        //view --> table state
        function sort () {
          index++;
          predicate = ng.isFunction(getter(scope)) ? getter(scope) : attr.stSort;
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

        element.bind('click', function sortClick () {
          if (predicate) {
            scope.$apply(sort);
          }
        });

        if (sortDefault) {
          index = sortDefault === 'reverse' ? 1 : 0;
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
  .directive('stPagination', ['stConfig', function (stConfig) {
    return {
      restrict: 'EA',
      require: '^stTable',
      scope: {
        stItemsByPage: '=?',
        stDisplayedPages: '=?',
        stPageChange: '&'
      },
      templateUrl: function (element, attrs) {
        if (attrs.stTemplate) {
          return attrs.stTemplate;
        }
        return stConfig.pagination.template;
      },
      link: function (scope, element, attrs, ctrl) {

        scope.stItemsByPage = scope.stItemsByPage ? +(scope.stItemsByPage) : stConfig.pagination.itemsByPage;
        scope.stDisplayedPages = scope.stDisplayedPages ? +(scope.stDisplayedPages) : stConfig.pagination.displayedPages;

        scope.currentPage = 1;
        scope.pages = [];

        function redraw () {
          var paginationState = ctrl.tableState().pagination;
          var start = 1;
          var end;
          var i;
          var prevPage = scope.currentPage;
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

          if (prevPage !== scope.currentPage) {
            scope.stPageChange({newPage: scope.currentPage});
          }
        }

        //table state --> view
        scope.$watch(function () {
          return ctrl.tableState().pagination;
        }, redraw, true);

        //scope --> table state  (--> view)
        scope.$watch('stItemsByPage', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            scope.selectPage(1);
          }
        });

        scope.$watch('stDisplayedPages', redraw);

        //view -> table state
        scope.selectPage = function (page) {
          if (page > 0 && page <= scope.numPages) {
            ctrl.slice((page - 1) * scope.stItemsByPage, scope.stItemsByPage);
          }
        };

        if (!ctrl.tableState().pagination.number) {
          ctrl.slice(0, scope.stItemsByPage);
        }
      }
    };
  }]);

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
              return scope.stPipe(ctrl.tableState(), ctrl);
            }
          }
        },

        post: function (scope, element, attrs, ctrl) {
          ctrl.pipe();
        }
      }
    };
  });

})(angular);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy90b3AudHh0Iiwic3JjL3NtYXJ0LXRhYmxlLm1vZHVsZS5qcyIsInNyYy9zdENvbmZpZy5qcyIsInNyYy9zdFRhYmxlLmpzIiwic3JjL3N0U2VhcmNoLmpzIiwic3JjL3N0U2VsZWN0Um93LmpzIiwic3JjL3N0U29ydC5qcyIsInNyYy9zdFBhZ2luYXRpb24uanMiLCJzcmMvc3RQaXBlLmpzIiwic3JjL2JvdHRvbS50eHQiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4QkEiLCJmaWxlIjoic21hcnQtdGFibGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKG5nLCB1bmRlZmluZWQpe1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4iLCJuZy5tb2R1bGUoJ3NtYXJ0LXRhYmxlJywgW10pLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlL3NtYXJ0LXRhYmxlL3BhZ2luYXRpb24uaHRtbCcsXHJcbiAgICAgICAgJzxuYXYgbmctaWY9XCJwYWdlcy5sZW5ndGggPj0gMlwiPjx1bCBjbGFzcz1cInBhZ2luYXRpb25cIj4nICtcclxuICAgICAgICAnPGxpIG5nLXJlcGVhdD1cInBhZ2UgaW4gcGFnZXNcIiBuZy1jbGFzcz1cInthY3RpdmU6IHBhZ2U9PWN1cnJlbnRQYWdlfVwiPjxhIG5nLWNsaWNrPVwic2VsZWN0UGFnZShwYWdlKVwiPnt7cGFnZX19PC9hPjwvbGk+JyArXHJcbiAgICAgICAgJzwvdWw+PC9uYXY+Jyk7XHJcbn1dKTtcclxuXHJcbiIsIm5nLm1vZHVsZSgnc21hcnQtdGFibGUnKVxyXG4gIC5jb25zdGFudCgnc3RDb25maWcnLCB7XHJcbiAgICBwYWdpbmF0aW9uOiB7XHJcbiAgICAgIHRlbXBsYXRlOiAndGVtcGxhdGUvc21hcnQtdGFibGUvcGFnaW5hdGlvbi5odG1sJyxcclxuICAgICAgaXRlbXNCeVBhZ2U6IDEwLFxyXG4gICAgICBkaXNwbGF5ZWRQYWdlczogNVxyXG4gICAgfSxcclxuICAgIHNlYXJjaDoge1xyXG4gICAgICBkZWxheTogNDAwIC8vIG1zXHJcbiAgICB9LFxyXG4gICAgc2VsZWN0OiB7XHJcbiAgICAgIG1vZGU6ICdzaW5nbGUnLFxyXG4gICAgICBzZWxlY3RlZENsYXNzOiAnc3Qtc2VsZWN0ZWQnLFxyXG4gICAgICBub3RTZWxlY3RhYmxlQ29sQ2xhc3M6ICdzdC1ub3Qtc2VsZWN0YWJsZSdcclxuICAgIH0sXHJcbiAgICBzb3J0OiB7XHJcbiAgICAgIGFzY2VudENsYXNzOiAnc3Qtc29ydC1hc2NlbnQnLFxyXG4gICAgICBkZXNjZW50Q2xhc3M6ICdzdC1zb3J0LWRlc2NlbnQnXHJcbiAgICB9LFxyXG4gICAgZWRpdDoge1xyXG4gICAgICAgIGRlZmF1bHRFZGl0UmVzb2x1dGlvbjogJ3NhdmUnLFxyXG4gICAgICAgIHJvd0VkaXRNb2RlOiAnc2luZ2xlJ1xyXG4gICAgfVxyXG4gIH0pOyIsIm5nLm1vZHVsZSgnc21hcnQtdGFibGUnKVxyXG4gICAgLmNvbnRyb2xsZXIoJ3N0VGFibGVDb250cm9sbGVyJywgWyckc2NvcGUnLCAnJHBhcnNlJywgJyRmaWx0ZXInLCAnJGF0dHJzJywgZnVuY3Rpb24gU3RUYWJsZUNvbnRyb2xsZXIoJHNjb3BlLCAkcGFyc2UsICRmaWx0ZXIsICRhdHRycykge1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSAkYXR0cnMuc3RUYWJsZTtcclxuICAgICAgICB2YXIgZGlzcGxheUdldHRlciA9ICRwYXJzZShwcm9wZXJ0eU5hbWUpO1xyXG4gICAgICAgIHZhciBkaXNwbGF5U2V0dGVyID0gZGlzcGxheUdldHRlci5hc3NpZ247XHJcbiAgICAgICAgdmFyIHNhZmVHZXR0ZXI7XHJcbiAgICAgICAgdmFyIG9yZGVyQnkgPSAkZmlsdGVyKCdvcmRlckJ5Jyk7XHJcbiAgICAgICAgdmFyIGZpbHRlciA9ICRmaWx0ZXIoJ2ZpbHRlcicpO1xyXG4gICAgICAgIHZhciBzYWZlQ29weSA9IGNvcHlSZWZzKGRpc3BsYXlHZXR0ZXIoJHNjb3BlKSk7XHJcbiAgICAgICAgdmFyIHRhYmxlU3RhdGUgPSB7XHJcbiAgICAgICAgICAgIHNvcnQ6IHt9LFxyXG4gICAgICAgICAgICBzZWFyY2g6IHt9LFxyXG4gICAgICAgICAgICBwYWdpbmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydDogMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIHZhciBmaWx0ZXJlZDtcclxuICAgICAgICB2YXIgcGlwZUFmdGVyU2FmZUNvcHkgPSB0cnVlO1xyXG4gICAgICAgIHZhciBjdHJsID0gdGhpcztcclxuICAgICAgICB2YXIgbGFzdFNlbGVjdGVkO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNvcHlSZWZzIChzcmMpIHtcclxuICAgICAgcmV0dXJuIHNyYyA/IFtdLmNvbmNhdChzcmMpIDogW107XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlU2FmZUNvcHkgKCkge1xyXG4gICAgICBzYWZlQ29weSA9IGNvcHlSZWZzKHNhZmVHZXR0ZXIoJHNjb3BlKSk7XHJcbiAgICAgIGlmIChwaXBlQWZ0ZXJTYWZlQ29weSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIGN0cmwucGlwZSgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCRhdHRycy5zdFNhZmVTcmMpIHtcclxuICAgICAgc2FmZUdldHRlciA9ICRwYXJzZSgkYXR0cnMuc3RTYWZlU3JjKTtcclxuICAgICAgJHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNhZmVTcmMgPSBzYWZlR2V0dGVyKCRzY29wZSk7XHJcbiAgICAgICAgcmV0dXJuIHNhZmVTcmMgPyBzYWZlU3JjLmxlbmd0aCA6IDA7XHJcblxyXG4gICAgICB9LCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBzYWZlQ29weS5sZW5ndGgpIHtcclxuICAgICAgICAgIHVwZGF0ZVNhZmVDb3B5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgJHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHNhZmVHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgfSwgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcclxuICAgICAgICAgIHVwZGF0ZVNhZmVDb3B5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHNvcnQgdGhlIHJvd3NcclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb24gfCBTdHJpbmd9IHByZWRpY2F0ZSAtIGZ1bmN0aW9uIG9yIHN0cmluZyB3aGljaCB3aWxsIGJlIHVzZWQgYXMgcHJlZGljYXRlIGZvciB0aGUgc29ydGluZ1xyXG4gICAgICogQHBhcmFtIFtyZXZlcnNlXSAtIGlmIHlvdSB3YW50IHRvIHJldmVyc2UgdGhlIG9yZGVyXHJcbiAgICAgKi9cclxuICAgIHRoaXMuc29ydEJ5ID0gZnVuY3Rpb24gc29ydEJ5IChwcmVkaWNhdGUsIHJldmVyc2UpIHtcclxuICAgICAgdGFibGVTdGF0ZS5zb3J0LnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcclxuICAgICAgdGFibGVTdGF0ZS5zb3J0LnJldmVyc2UgPSByZXZlcnNlID09PSB0cnVlO1xyXG5cclxuICAgICAgaWYgKG5nLmlzRnVuY3Rpb24ocHJlZGljYXRlKSkge1xyXG4gICAgICAgIHRhYmxlU3RhdGUuc29ydC5mdW5jdGlvbk5hbWUgPSBwcmVkaWNhdGUubmFtZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBkZWxldGUgdGFibGVTdGF0ZS5zb3J0LmZ1bmN0aW9uTmFtZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGFibGVTdGF0ZS5wYWdpbmF0aW9uLnN0YXJ0ID0gMDtcclxuICAgICAgcmV0dXJuIHRoaXMucGlwZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHNlYXJjaCBtYXRjaGluZyByb3dzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgLSB0aGUgaW5wdXQgc3RyaW5nXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3ByZWRpY2F0ZV0gLSB0aGUgcHJvcGVydHkgbmFtZSBhZ2FpbnN0IHlvdSB3YW50IHRvIGNoZWNrIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIGl0IHdpbGwgc2VhcmNoIG9uIGFsbCBwcm9wZXJ0aWVzXHJcbiAgICAgKi9cclxuICAgIHRoaXMuc2VhcmNoID0gZnVuY3Rpb24gc2VhcmNoIChpbnB1dCwgcHJlZGljYXRlKSB7XHJcbiAgICAgIHZhciBwcmVkaWNhdGVPYmplY3QgPSB0YWJsZVN0YXRlLnNlYXJjaC5wcmVkaWNhdGVPYmplY3QgfHwge307XHJcbiAgICAgIHZhciBwcm9wID0gcHJlZGljYXRlID8gcHJlZGljYXRlIDogJyQnO1xyXG5cclxuICAgICAgaW5wdXQgPSBuZy5pc1N0cmluZyhpbnB1dCkgPyBpbnB1dC50cmltKCkgOiBpbnB1dDtcclxuICAgICAgcHJlZGljYXRlT2JqZWN0W3Byb3BdID0gaW5wdXQ7XHJcbiAgICAgIC8vIHRvIGF2b2lkIHRvIGZpbHRlciBvdXQgbnVsbCB2YWx1ZVxyXG4gICAgICBpZiAoIWlucHV0KSB7XHJcbiAgICAgICAgZGVsZXRlIHByZWRpY2F0ZU9iamVjdFtwcm9wXTtcclxuICAgICAgfVxyXG4gICAgICB0YWJsZVN0YXRlLnNlYXJjaC5wcmVkaWNhdGVPYmplY3QgPSBwcmVkaWNhdGVPYmplY3Q7XHJcbiAgICAgIHRhYmxlU3RhdGUucGFnaW5hdGlvbi5zdGFydCA9IDA7XHJcbiAgICAgIHJldHVybiB0aGlzLnBpcGUoKTtcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0aGlzIHdpbGwgY2hhaW4gdGhlIG9wZXJhdGlvbnMgb2Ygc29ydGluZyBhbmQgZmlsdGVyaW5nIGJhc2VkIG9uIHRoZSBjdXJyZW50IHRhYmxlIHN0YXRlIChzb3J0IG9wdGlvbnMsIGZpbHRlcmluZywgZWN0KVxyXG4gICAgICovXHJcbiAgICB0aGlzLnBpcGUgPSBmdW5jdGlvbiBwaXBlICgpIHtcclxuICAgICAgdmFyIHBhZ2luYXRpb24gPSB0YWJsZVN0YXRlLnBhZ2luYXRpb247XHJcbiAgICAgIHZhciBvdXRwdXQ7XHJcbiAgICAgIGZpbHRlcmVkID0gdGFibGVTdGF0ZS5zZWFyY2gucHJlZGljYXRlT2JqZWN0ID8gZmlsdGVyKHNhZmVDb3B5LCB0YWJsZVN0YXRlLnNlYXJjaC5wcmVkaWNhdGVPYmplY3QpIDogc2FmZUNvcHk7XHJcbiAgICAgIGlmICh0YWJsZVN0YXRlLnNvcnQucHJlZGljYXRlKSB7XHJcbiAgICAgICAgZmlsdGVyZWQgPSBvcmRlckJ5KGZpbHRlcmVkLCB0YWJsZVN0YXRlLnNvcnQucHJlZGljYXRlLCB0YWJsZVN0YXRlLnNvcnQucmV2ZXJzZSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHBhZ2luYXRpb24ubnVtYmVyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBwYWdpbmF0aW9uLm51bWJlck9mUGFnZXMgPSBmaWx0ZXJlZC5sZW5ndGggPiAwID8gTWF0aC5jZWlsKGZpbHRlcmVkLmxlbmd0aCAvIHBhZ2luYXRpb24ubnVtYmVyKSA6IDE7XHJcbiAgICAgICAgcGFnaW5hdGlvbi5zdGFydCA9IHBhZ2luYXRpb24uc3RhcnQgPj0gZmlsdGVyZWQubGVuZ3RoID8gKHBhZ2luYXRpb24ubnVtYmVyT2ZQYWdlcyAtIDEpICogcGFnaW5hdGlvbi5udW1iZXIgOiBwYWdpbmF0aW9uLnN0YXJ0O1xyXG4gICAgICAgIG91dHB1dCA9IGZpbHRlcmVkLnNsaWNlKHBhZ2luYXRpb24uc3RhcnQsIHBhZ2luYXRpb24uc3RhcnQgKyBwYXJzZUludChwYWdpbmF0aW9uLm51bWJlcikpO1xyXG4gICAgICB9XHJcbiAgICAgIGRpc3BsYXlTZXR0ZXIoJHNjb3BlLCBvdXRwdXQgfHwgZmlsdGVyZWQpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHNlbGVjdCBhIGRhdGFSb3cgKGl0IHdpbGwgYWRkIHRoZSBhdHRyaWJ1dGUgaXNTZWxlY3RlZCB0byB0aGUgcm93IG9iamVjdClcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3cgLSB0aGUgcm93IHRvIHNlbGVjdFxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFttb2RlXSAtIFwic2luZ2xlXCIgb3IgXCJtdWx0aXBsZVwiIChtdWx0aXBsZSBieSBkZWZhdWx0KVxyXG4gICAgICovXHJcbiAgICB0aGlzLnNlbGVjdCA9IGZ1bmN0aW9uIHNlbGVjdCAocm93LCBtb2RlKSB7XHJcbiAgICAgIHZhciByb3dzID0gc2FmZUNvcHk7XHJcbiAgICAgIHZhciBpbmRleCA9IHJvd3MuaW5kZXhPZihyb3cpO1xyXG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XHJcbiAgICAgICAgaWYgKG1vZGUgPT09ICdzaW5nbGUnKSB7XHJcbiAgICAgICAgICByb3cuaXNTZWxlY3RlZCA9IHJvdy5pc1NlbGVjdGVkICE9PSB0cnVlO1xyXG4gICAgICAgICAgaWYgKGxhc3RTZWxlY3RlZCkge1xyXG4gICAgICAgICAgICBsYXN0U2VsZWN0ZWQuaXNTZWxlY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdFNlbGVjdGVkID0gcm93LmlzU2VsZWN0ZWQgPT09IHRydWUgPyByb3cgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJvd3NbaW5kZXhdLmlzU2VsZWN0ZWQgPSAhcm93c1tpbmRleF0uaXNTZWxlY3RlZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0YWtlIGEgc2xpY2Ugb2YgdGhlIGN1cnJlbnQgc29ydGVkL2ZpbHRlcmVkIGNvbGxlY3Rpb24gKHBhZ2luYXRpb24pXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHN0YXJ0IC0gc3RhcnQgaW5kZXggb2YgdGhlIHNsaWNlXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbnVtYmVyIC0gdGhlIG51bWJlciBvZiBpdGVtIGluIHRoZSBzbGljZVxyXG4gICAgICovXHJcbiAgICB0aGlzLnNsaWNlID0gZnVuY3Rpb24gc3BsaWNlIChzdGFydCwgbnVtYmVyKSB7XHJcbiAgICAgIHRhYmxlU3RhdGUucGFnaW5hdGlvbi5zdGFydCA9IHN0YXJ0O1xyXG4gICAgICB0YWJsZVN0YXRlLnBhZ2luYXRpb24ubnVtYmVyID0gbnVtYmVyO1xyXG4gICAgICByZXR1cm4gdGhpcy5waXBlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJuIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSB0YWJsZVxyXG4gICAgICogQHJldHVybnMge3tzb3J0OiB7fSwgc2VhcmNoOiB7fSwgcGFnaW5hdGlvbjoge3N0YXJ0OiBudW1iZXJ9fX1cclxuICAgICAqL1xyXG4gICAgdGhpcy50YWJsZVN0YXRlID0gZnVuY3Rpb24gZ2V0VGFibGVTdGF0ZSAoKSB7XHJcbiAgICAgIHJldHVybiB0YWJsZVN0YXRlO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmdldEZpbHRlcmVkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIGdldEZpbHRlcmVkQ29sbGVjdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmaWx0ZXJlZCB8fCBzYWZlQ29weTtcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVc2UgYSBkaWZmZXJlbnQgZmlsdGVyIGZ1bmN0aW9uIHRoYW4gdGhlIGFuZ3VsYXIgRmlsdGVyRmlsdGVyXHJcbiAgICAgKiBAcGFyYW0gZmlsdGVyTmFtZSB0aGUgbmFtZSB1bmRlciB3aGljaCB0aGUgY3VzdG9tIGZpbHRlciBpcyByZWdpc3RlcmVkXHJcbiAgICAgKi9cclxuICAgIHRoaXMuc2V0RmlsdGVyRnVuY3Rpb24gPSBmdW5jdGlvbiBzZXRGaWx0ZXJGdW5jdGlvbiAoZmlsdGVyTmFtZSkge1xyXG4gICAgICBmaWx0ZXIgPSAkZmlsdGVyKGZpbHRlck5hbWUpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFVzZSBhIGRpZmZlcmVudCBmdW5jdGlvbiB0aGFuIHRoZSBhbmd1bGFyIG9yZGVyQnlcclxuICAgICAqIEBwYXJhbSBzb3J0RnVuY3Rpb25OYW1lIHRoZSBuYW1lIHVuZGVyIHdoaWNoIHRoZSBjdXN0b20gb3JkZXIgZnVuY3Rpb24gaXMgcmVnaXN0ZXJlZFxyXG4gICAgICovXHJcbiAgICB0aGlzLnNldFNvcnRGdW5jdGlvbiA9IGZ1bmN0aW9uIHNldFNvcnRGdW5jdGlvbiAoc29ydEZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICBvcmRlckJ5ID0gJGZpbHRlcihzb3J0RnVuY3Rpb25OYW1lKTtcclxuICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFVzdWFsbHkgd2hlbiB0aGUgc2FmZSBjb3B5IGlzIHVwZGF0ZWQgdGhlIHBpcGUgZnVuY3Rpb24gaXMgY2FsbGVkLlxyXG4gICAgICAgICAqIENhbGxpbmcgdGhpcyBtZXRob2Qgd2lsbCBwcmV2ZW50IGl0LCB3aGljaCBpcyBzb21ldGhpbmcgcmVxdWlyZWQgd2hlbiB1c2luZyBhIGN1c3RvbSBwaXBlIGZ1bmN0aW9uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5wcmV2ZW50UGlwZU9uV2F0Y2ggPSBmdW5jdGlvbiBwcmV2ZW50UGlwZSgpIHtcclxuICAgICAgICAgICAgcGlwZUFmdGVyU2FmZUNvcHkgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmZpbmQgPSBmdW5jdGlvbiAoZXhwcmVzc2lvbikge1xyXG4gICAgICAgICAgICB2YXIgcm93cyA9IHNhZmVDb3B5O1xyXG4gICAgICAgICAgICByZXR1cm4gJGZpbHRlcignZmlsdGVyJykocm93cywgZXhwcmVzc2lvbik7XHJcbiAgICAgICAgfTtcclxuICAgIH1dKVxyXG4gICAgLmRpcmVjdGl2ZSgnc3RUYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnc3RUYWJsZUNvbnRyb2xsZXInLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHIsIGN0cmwpIHtcclxuXHJcbiAgICAgICAgaWYgKGF0dHIuc3RTZXRGaWx0ZXIpIHtcclxuICAgICAgICAgIGN0cmwuc2V0RmlsdGVyRnVuY3Rpb24oYXR0ci5zdFNldEZpbHRlcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXR0ci5zdFNldFNvcnQpIHtcclxuICAgICAgICAgIGN0cmwuc2V0U29ydEZ1bmN0aW9uKGF0dHIuc3RTZXRTb3J0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfSk7XHJcbiIsIm5nLm1vZHVsZSgnc21hcnQtdGFibGUnKVxyXG4gIC5kaXJlY3RpdmUoJ3N0U2VhcmNoJywgWydzdENvbmZpZycsICckdGltZW91dCcsIGZ1bmN0aW9uIChzdENvbmZpZywgJHRpbWVvdXQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlcXVpcmU6ICdec3RUYWJsZScsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0ciwgY3RybCkge1xyXG4gICAgICAgIHZhciB0YWJsZUN0cmwgPSBjdHJsO1xyXG4gICAgICAgIHZhciBwcm9taXNlID0gbnVsbDtcclxuICAgICAgICB2YXIgdGhyb3R0bGUgPSBhdHRyLnN0RGVsYXkgfHwgc3RDb25maWcuc2VhcmNoLmRlbGF5O1xyXG5cclxuICAgICAgICBhdHRyLiRvYnNlcnZlKCdzdFNlYXJjaCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgIHZhciBpbnB1dCA9IGVsZW1lbnRbMF0udmFsdWU7XHJcbiAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIGlucHV0KSB7XHJcbiAgICAgICAgICAgIGN0cmwudGFibGVTdGF0ZSgpLnNlYXJjaCA9IHt9O1xyXG4gICAgICAgICAgICB0YWJsZUN0cmwuc2VhcmNoKGlucHV0LCBuZXdWYWx1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vdGFibGUgc3RhdGUgLT4gdmlld1xyXG4gICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gY3RybC50YWJsZVN0YXRlKCkuc2VhcmNoO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgIHZhciBwcmVkaWNhdGVFeHByZXNzaW9uID0gYXR0ci5zdFNlYXJjaCB8fCAnJCc7XHJcbiAgICAgICAgICBpZiAobmV3VmFsdWUucHJlZGljYXRlT2JqZWN0ICYmIG5ld1ZhbHVlLnByZWRpY2F0ZU9iamVjdFtwcmVkaWNhdGVFeHByZXNzaW9uXSAhPT0gZWxlbWVudFswXS52YWx1ZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50WzBdLnZhbHVlID0gbmV3VmFsdWUucHJlZGljYXRlT2JqZWN0W3ByZWRpY2F0ZUV4cHJlc3Npb25dIHx8ICcnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIHRydWUpO1xyXG5cclxuICAgICAgICAvLyB2aWV3IC0+IHRhYmxlIHN0YXRlXHJcbiAgICAgICAgZWxlbWVudC5iaW5kKCdpbnB1dCcsIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgIGV2dCA9IGV2dC5vcmlnaW5hbEV2ZW50IHx8IGV2dDtcclxuICAgICAgICAgIGlmIChwcm9taXNlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChwcm9taXNlKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBwcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0YWJsZUN0cmwuc2VhcmNoKGV2dC50YXJnZXQudmFsdWUsIGF0dHIuc3RTZWFyY2ggfHwgJycpO1xyXG4gICAgICAgICAgICBwcm9taXNlID0gbnVsbDtcclxuICAgICAgICAgIH0sIHRocm90dGxlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XSk7XHJcbiIsIm5nLm1vZHVsZSgnc21hcnQtdGFibGUnKVxyXG4gICAgLmRpcmVjdGl2ZSgnc3RTZWxlY3RSb3cnLCBbJ3N0Q29uZmlnJywgZnVuY3Rpb24gKHN0Q29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVxdWlyZTogJ15zdFRhYmxlJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHJvdzogJz1zdFNlbGVjdFJvdycsXHJcbiAgICAgICAgICAgICAgICBvblNlbGVjdGVkOiAnJidcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyLCBjdHJsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbW9kZSA9IGF0dHIuc3RTZWxlY3RNb2RlIHx8IHN0Q29uZmlnLnNlbGVjdC5tb2RlO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uU2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBhdHRyLiRvYnNlcnZlKCdvblNlbGVjdGVkJywgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb25TZWxlY3RlZCA9IHNjb3BlLiRwYXJlbnQuJGV2YWwodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5iaW5kKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNlbGVjdChzY29wZS5yb3csIG1vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob25TZWxlY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25TZWxlY3RlZChzY29wZS5yb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmZpbmQoJ3RkOm5vdCguJyArIHN0Q29uZmlnLnNlbGVjdC5ub3RTZWxlY3RhYmxlQ29sQ2xhc3MgKyAnKScpLmJpbmQoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2VsZWN0KHNjb3BlLnJvdywgbW9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvblNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblNlbGVjdGVkKHNjb3BlLnJvdyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuXHJcblxyXG4gICAgICAgIHNjb3BlLiR3YXRjaCgncm93LmlzU2VsZWN0ZWQnLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgIGlmIChuZXdWYWx1ZSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKHN0Q29uZmlnLnNlbGVjdC5zZWxlY3RlZENsYXNzKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3Moc3RDb25maWcuc2VsZWN0LnNlbGVjdGVkQ2xhc3MpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKTtcclxuIiwibmcubW9kdWxlKCdzbWFydC10YWJsZScpXHJcbiAgLmRpcmVjdGl2ZSgnc3RTb3J0JywgWydzdENvbmZpZycsICckcGFyc2UnLCBmdW5jdGlvbiAoc3RDb25maWcsICRwYXJzZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgcmVxdWlyZTogJ15zdFRhYmxlJyxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyLCBjdHJsKSB7XHJcblxyXG4gICAgICAgIHZhciBwcmVkaWNhdGUgPSBhdHRyLnN0U29ydDtcclxuICAgICAgICB2YXIgZ2V0dGVyID0gJHBhcnNlKHByZWRpY2F0ZSk7XHJcbiAgICAgICAgdmFyIGluZGV4ID0gMDtcclxuICAgICAgICB2YXIgY2xhc3NBc2NlbnQgPSBhdHRyLnN0Q2xhc3NBc2NlbnQgfHwgc3RDb25maWcuc29ydC5hc2NlbnRDbGFzcztcclxuICAgICAgICB2YXIgY2xhc3NEZXNjZW50ID0gYXR0ci5zdENsYXNzRGVzY2VudCB8fCBzdENvbmZpZy5zb3J0LmRlc2NlbnRDbGFzcztcclxuICAgICAgICB2YXIgc3RhdGVDbGFzc2VzID0gW2NsYXNzQXNjZW50LCBjbGFzc0Rlc2NlbnRdO1xyXG4gICAgICAgIHZhciBzb3J0RGVmYXVsdDtcclxuXHJcbiAgICAgICAgaWYgKGF0dHIuc3RTb3J0RGVmYXVsdCkge1xyXG4gICAgICAgICAgc29ydERlZmF1bHQgPSBzY29wZS4kZXZhbChhdHRyLnN0U29ydERlZmF1bHQpICE9PSB1bmRlZmluZWQgPyBzY29wZS4kZXZhbChhdHRyLnN0U29ydERlZmF1bHQpIDogYXR0ci5zdFNvcnREZWZhdWx0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy92aWV3IC0tPiB0YWJsZSBzdGF0ZVxyXG4gICAgICAgIGZ1bmN0aW9uIHNvcnQgKCkge1xyXG4gICAgICAgICAgaW5kZXgrKztcclxuICAgICAgICAgIHByZWRpY2F0ZSA9IG5nLmlzRnVuY3Rpb24oZ2V0dGVyKHNjb3BlKSkgPyBnZXR0ZXIoc2NvcGUpIDogYXR0ci5zdFNvcnQ7XHJcbiAgICAgICAgICBpZiAoaW5kZXggJSAzID09PSAwICYmIGF0dHIuc3RTa2lwTmF0dXJhbCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vbWFudWFsIHJlc2V0XHJcbiAgICAgICAgICAgIGluZGV4ID0gMDtcclxuICAgICAgICAgICAgY3RybC50YWJsZVN0YXRlKCkuc29ydCA9IHt9O1xyXG4gICAgICAgICAgICBjdHJsLnRhYmxlU3RhdGUoKS5wYWdpbmF0aW9uLnN0YXJ0ID0gMDtcclxuICAgICAgICAgICAgY3RybC5waXBlKCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjdHJsLnNvcnRCeShwcmVkaWNhdGUsIGluZGV4ICUgMiA9PT0gMCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlbGVtZW50LmJpbmQoJ2NsaWNrJywgZnVuY3Rpb24gc29ydENsaWNrICgpIHtcclxuICAgICAgICAgIGlmIChwcmVkaWNhdGUpIHtcclxuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KHNvcnQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoc29ydERlZmF1bHQpIHtcclxuICAgICAgICAgIGluZGV4ID0gc29ydERlZmF1bHQgPT09ICdyZXZlcnNlJyA/IDEgOiAwO1xyXG4gICAgICAgICAgc29ydCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy90YWJsZSBzdGF0ZSAtLT4gdmlld1xyXG4gICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gY3RybC50YWJsZVN0YXRlKCkuc29ydDtcclxuICAgICAgICB9LCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgIGlmIChuZXdWYWx1ZS5wcmVkaWNhdGUgIT09IHByZWRpY2F0ZSkge1xyXG4gICAgICAgICAgICBpbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGVsZW1lbnRcclxuICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoY2xhc3NBc2NlbnQpXHJcbiAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGNsYXNzRGVzY2VudCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpbmRleCA9IG5ld1ZhbHVlLnJldmVyc2UgPT09IHRydWUgPyAyIDogMTtcclxuICAgICAgICAgICAgZWxlbWVudFxyXG4gICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhzdGF0ZUNsYXNzZXNbaW5kZXggJSAyXSlcclxuICAgICAgICAgICAgICAuYWRkQ2xhc3Moc3RhdGVDbGFzc2VzW2luZGV4IC0gMV0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIHRydWUpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKTtcclxuIiwibmcubW9kdWxlKCdzbWFydC10YWJsZScpXHJcbiAgLmRpcmVjdGl2ZSgnc3RQYWdpbmF0aW9uJywgWydzdENvbmZpZycsIGZ1bmN0aW9uIChzdENvbmZpZykge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdFQScsXHJcbiAgICAgIHJlcXVpcmU6ICdec3RUYWJsZScsXHJcbiAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgc3RJdGVtc0J5UGFnZTogJz0/JyxcclxuICAgICAgICBzdERpc3BsYXllZFBhZ2VzOiAnPT8nLFxyXG4gICAgICAgIHN0UGFnZUNoYW5nZTogJyYnXHJcbiAgICAgIH0sXHJcbiAgICAgIHRlbXBsYXRlVXJsOiBmdW5jdGlvbiAoZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICBpZiAoYXR0cnMuc3RUZW1wbGF0ZSkge1xyXG4gICAgICAgICAgcmV0dXJuIGF0dHJzLnN0VGVtcGxhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdENvbmZpZy5wYWdpbmF0aW9uLnRlbXBsYXRlO1xyXG4gICAgICB9LFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XHJcblxyXG4gICAgICAgIHNjb3BlLnN0SXRlbXNCeVBhZ2UgPSBzY29wZS5zdEl0ZW1zQnlQYWdlID8gKyhzY29wZS5zdEl0ZW1zQnlQYWdlKSA6IHN0Q29uZmlnLnBhZ2luYXRpb24uaXRlbXNCeVBhZ2U7XHJcbiAgICAgICAgc2NvcGUuc3REaXNwbGF5ZWRQYWdlcyA9IHNjb3BlLnN0RGlzcGxheWVkUGFnZXMgPyArKHNjb3BlLnN0RGlzcGxheWVkUGFnZXMpIDogc3RDb25maWcucGFnaW5hdGlvbi5kaXNwbGF5ZWRQYWdlcztcclxuXHJcbiAgICAgICAgc2NvcGUuY3VycmVudFBhZ2UgPSAxO1xyXG4gICAgICAgIHNjb3BlLnBhZ2VzID0gW107XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlZHJhdyAoKSB7XHJcbiAgICAgICAgICB2YXIgcGFnaW5hdGlvblN0YXRlID0gY3RybC50YWJsZVN0YXRlKCkucGFnaW5hdGlvbjtcclxuICAgICAgICAgIHZhciBzdGFydCA9IDE7XHJcbiAgICAgICAgICB2YXIgZW5kO1xyXG4gICAgICAgICAgdmFyIGk7XHJcbiAgICAgICAgICB2YXIgcHJldlBhZ2UgPSBzY29wZS5jdXJyZW50UGFnZTtcclxuICAgICAgICAgIHNjb3BlLmN1cnJlbnRQYWdlID0gTWF0aC5mbG9vcihwYWdpbmF0aW9uU3RhdGUuc3RhcnQgLyBwYWdpbmF0aW9uU3RhdGUubnVtYmVyKSArIDE7XHJcblxyXG4gICAgICAgICAgc3RhcnQgPSBNYXRoLm1heChzdGFydCwgc2NvcGUuY3VycmVudFBhZ2UgLSBNYXRoLmFicyhNYXRoLmZsb29yKHNjb3BlLnN0RGlzcGxheWVkUGFnZXMgLyAyKSkpO1xyXG4gICAgICAgICAgZW5kID0gc3RhcnQgKyBzY29wZS5zdERpc3BsYXllZFBhZ2VzO1xyXG5cclxuICAgICAgICAgIGlmIChlbmQgPiBwYWdpbmF0aW9uU3RhdGUubnVtYmVyT2ZQYWdlcykge1xyXG4gICAgICAgICAgICBlbmQgPSBwYWdpbmF0aW9uU3RhdGUubnVtYmVyT2ZQYWdlcyArIDE7XHJcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC5tYXgoMSwgZW5kIC0gc2NvcGUuc3REaXNwbGF5ZWRQYWdlcyk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgc2NvcGUucGFnZXMgPSBbXTtcclxuICAgICAgICAgIHNjb3BlLm51bVBhZ2VzID0gcGFnaW5hdGlvblN0YXRlLm51bWJlck9mUGFnZXM7XHJcblxyXG4gICAgICAgICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xyXG4gICAgICAgICAgICBzY29wZS5wYWdlcy5wdXNoKGkpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChwcmV2UGFnZSAhPT0gc2NvcGUuY3VycmVudFBhZ2UpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RQYWdlQ2hhbmdlKHtuZXdQYWdlOiBzY29wZS5jdXJyZW50UGFnZX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy90YWJsZSBzdGF0ZSAtLT4gdmlld1xyXG4gICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gY3RybC50YWJsZVN0YXRlKCkucGFnaW5hdGlvbjtcclxuICAgICAgICB9LCByZWRyYXcsIHRydWUpO1xyXG5cclxuICAgICAgICAvL3Njb3BlIC0tPiB0YWJsZSBzdGF0ZSAgKC0tPiB2aWV3KVxyXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnc3RJdGVtc0J5UGFnZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcclxuICAgICAgICAgICAgc2NvcGUuc2VsZWN0UGFnZSgxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2NvcGUuJHdhdGNoKCdzdERpc3BsYXllZFBhZ2VzJywgcmVkcmF3KTtcclxuXHJcbiAgICAgICAgLy92aWV3IC0+IHRhYmxlIHN0YXRlXHJcbiAgICAgICAgc2NvcGUuc2VsZWN0UGFnZSA9IGZ1bmN0aW9uIChwYWdlKSB7XHJcbiAgICAgICAgICBpZiAocGFnZSA+IDAgJiYgcGFnZSA8PSBzY29wZS5udW1QYWdlcykge1xyXG4gICAgICAgICAgICBjdHJsLnNsaWNlKChwYWdlIC0gMSkgKiBzY29wZS5zdEl0ZW1zQnlQYWdlLCBzY29wZS5zdEl0ZW1zQnlQYWdlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoIWN0cmwudGFibGVTdGF0ZSgpLnBhZ2luYXRpb24ubnVtYmVyKSB7XHJcbiAgICAgICAgICBjdHJsLnNsaWNlKDAsIHNjb3BlLnN0SXRlbXNCeVBhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XSk7XHJcbiIsIm5nLm1vZHVsZSgnc21hcnQtdGFibGUnKVxyXG4gIC5kaXJlY3RpdmUoJ3N0UGlwZScsIGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlcXVpcmU6ICdzdFRhYmxlJyxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBzdFBpcGU6ICc9J1xyXG4gICAgICB9LFxyXG4gICAgICBsaW5rOiB7XHJcblxyXG4gICAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xyXG4gICAgICAgICAgaWYgKG5nLmlzRnVuY3Rpb24oc2NvcGUuc3RQaXBlKSkge1xyXG4gICAgICAgICAgICBjdHJsLnByZXZlbnRQaXBlT25XYXRjaCgpO1xyXG4gICAgICAgICAgICBjdHJsLnBpcGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLnN0UGlwZShjdHJsLnRhYmxlU3RhdGUoKSwgY3RybCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBwb3N0OiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XHJcbiAgICAgICAgICBjdHJsLnBpcGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfSk7XHJcbiIsIn0pKGFuZ3VsYXIpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==