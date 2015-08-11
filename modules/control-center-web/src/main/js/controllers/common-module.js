/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var controlCenterModule = angular.module('ignite-web-control-center', ['smart-table', 'mgcrea.ngStrap', 'ui.ace', 'ngSanitize']);

// Modal popup configuration.
controlCenterModule.config(function ($modalProvider) {
    angular.extend($modalProvider.defaults, {
        html: true
    });
});

// Tooltips configuration.
controlCenterModule.config(function ($tooltipProvider) {
    angular.extend($tooltipProvider.defaults, {
        container: 'body',
        placement: 'right',
        html: 'true',
        trigger: 'click hover'
    });
});

// Comboboxes configuration.
controlCenterModule.config(function ($selectProvider) {
    angular.extend($selectProvider.defaults, {
        maxLength: '1',
        allText: 'Select All',
        noneText: 'Clear All',
        templateUrl: '/select',
        iconCheckmark: 'fa fa-check',
        caretHtml: '<span class="caret"></span>'
    });
});

// Alerts configuration.
controlCenterModule.config(function ($alertProvider) {
    angular.extend($alertProvider.defaults, {
        container: 'body',
        placement: 'top-right',
        duration: '5',
        type: 'danger'
    });
});

// Common functions to be used in controllers.
controlCenterModule.service('$common', [
    '$alert', function ($alert) {
        function isDefined(v) {
            return !(v === undefined || v === null);
        }

        function isEmptyArray(arr) {
            if (isDefined(arr))
                return arr.length == 0;

            return true;
        }

        function isEmptyString(s) {
            if (isDefined(s))
                return s.trim().length == 0;

            return true;
        }

        var msgModal = undefined;

        function errorMessage(errMsg) {
            return errMsg ? errMsg : 'Internal server error.';
        }

        function showError(msg, placement, container) {
            if (msgModal)
                msgModal.hide();

            msgModal = $alert({
                title: errorMessage(msg),
                placement: placement ? placement : 'top-right',
                container: container ? container : 'body'
            });

            return false;
        }

        var javaBuildInClasses = [
            'BigDecimal', 'Boolean', 'Byte', 'Date', 'Double', 'Float', 'Integer', 'Long', 'Short', 'String', 'Time', 'Timestamp', 'UUID'
        ];

        var javaBuildInFullNameClasses = [
            'java.math.BigDecimal', 'java.lang.Boolean', 'java.lang.Byte', 'java.sql.Date', 'java.lang.Double',
            'java.lang.Float', 'java.lang.Integer', 'java.lang.Long', 'java.lang.Short', 'java.lang.String',
            'java.sql.Time', 'java.sql.Timestamp', 'java.util.UUID'
        ];

        function isJavaBuildInClass(cls) {
            if (isEmptyString(cls))
                return false;

            return _.contains(javaBuildInClasses, cls) || _.contains(javaBuildInFullNameClasses, cls);
        }

        var JDBC_TYPES = [
            'BIT', 'BOOLEAN', 'TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT', 'REAL', 'FLOAT', 'DOUBLE',
            'NUMERIC', 'DECIMAL', 'CHAR', 'VARCHAR', 'LONGVARCHAR', 'NCHAR', 'NVARCHAR', 'LONGNVARCHAR',
            'DATE', 'TIME', 'TIMESTAMP'
        ];

        var JAVA_KEYWORDS = [
            'abstract',     'assert',        'boolean',      'break',           'byte',
            'case',         'catch',         'char',         'class',           'const',
            'continue',     'default',       'do',           'double',          'else',
            'enum',         'extends',       'false',        'final',           'finally',
            'float',        'for',           'goto',         'if',              'implements',
            'import',       'instanceof',    'int',          'interface',       'long',
            'native',       'new',           'null',         'package',         'private',
            'protected',    'public',        'return',       'short',           'static',
            'strictfp',     'super',         'switch',       'synchronized',    'this',
            'throw',        'throws',        'transient',    'true',            'try',
            'void',         'volatile',      'while'
        ];

        var VALID_JAVA_IDENTIFIER = new RegExp('^[a-zA-Z_$][a-zA-Z\d_$]*');

        function isValidJavaIdentifier(msg, ident) {
            if (isEmptyString(ident))
                return showError(msg + ' could not be empty!');

            if (_.contains(JAVA_KEYWORDS, ident))
                return showError(msg + ' could not contains reserved java keyword: "' + ident + '"!');

            if (!VALID_JAVA_IDENTIFIER.test(ident))
                return showError(msg + ' contains invalid identifier: "' + ident + '"!');

            return true;
        }

        var context = null;

        /**
         * Calculate width of specified text in body's font.
         *
         * @param text Text to calculate width.
         * @returns {Number} Width of text in pixels.
         */
        function measureText(text) {
            if (!context) {
                var canvas = document.createElement('canvas');

                context = canvas.getContext('2d');

                var style = window.getComputedStyle(document.getElementsByTagName('body')[0]);

                context.font = style.fontSize + ' ' + style.fontFamily;
            }

            return context.measureText(text).width;
        }

        /**
         * Compact java full class name by max number of characters.
         *
         * @param s Class name to cut.
         * @param maxLength Max available width in characters.
         * @returns {*} Compacted class name.
         */
        function compactByMaxCharts(s, maxLength) {
            if (s.length <= maxLength)
                return s;

            var totalLength = s.length;

            var packages = s.split('.');

            var packageCnt = packages.length - 1;

            for (var i = 0; i < packageCnt && totalLength > maxLength; i++) {
                if (packages[i].length > 0) {
                    totalLength -= packages[i].length - 1;

                    packages[i] = packages[i][0];
                }
            }

            if (totalLength > maxLength) {
                var className = packages[packageCnt];

                var classNameLen = className.length;

                var remains = Math.min(maxLength - totalLength + classNameLen, classNameLen);

                if (remains < 3)
                    remains = Math.min(3, classNameLen);

                packages[packageCnt] = className.substring(0, remains) + '...';
            }

            var result = packages[0];

            for (i = 1; i < packages.length; i++)
                result += '.' + packages[i];

            return result
        }

        /**
         * Compact java full class name by max number of pixels.
         *
         * @param s Class name to cut.
         * @param maxWidth Maximum available width in pixels.
         * @returns {*} Compacted class name.
         */
        function compactByMaxPixels(s, maxWidth) {
            var totalLength = measureText(s);

            if (totalLength <= maxWidth)
                return s;

            var packages = s.split('.');

            var packageCnt = packages.length - 1;

            for (var i = 0; i < packageCnt && totalLength > maxWidth; i++) {
                if (packages[i].length > 1) {
                    totalLength -= measureText(packages[i].substring(2, packages[i].length));

                    packages[i] = packages[i][0];
                }
            }

            var shortPackage = '';

            for (i = 0; i < packageCnt; i++)
                shortPackage += packages[i] + '.';

            var className = packages[packageCnt];

            var classLen = className.length;

            var minLen = Math.min(classLen, 3);

            totalLength = measureText(shortPackage + className);

            // Compact class name if shorten package path is very long.
            if (totalLength > maxWidth) {
                var maxLen = classLen;

                var middleLen = (minLen + (maxLen - minLen) / 2 ) | 0;

                var minLenPx = measureText(shortPackage + className.substr(0, minLen) + '...');
                var maxLenPx = totalLength;

                while (middleLen != minLen && middleLen != maxLen) {
                    var middleLenPx = measureText(shortPackage + className.substr(0, middleLen) + '...');

                    if (middleLenPx > maxWidth) {
                        maxLen = middleLen;
                        maxLenPx = middleLenPx;
                    }
                    else {
                        minLen = middleLen;
                        minLenPx = middleLenPx;
                    }

                    middleLen = (minLen + (maxLen - minLen) / 2 ) | 0;
                }

                return shortPackage + className.substring(0, middleLen) + '...';
            }

            return shortPackage + className;
        }

        return {
            getModel: function (obj, field) {
                var path = field.path;

                if (!isDefined(path))
                    return obj;

                path = path.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
                path = path.replace(/^\./, '');           // strip a leading dot

                var segs = path.split('.');
                var root = obj;

                while (segs.length > 0) {
                    var pathStep = segs.shift();

                    if (typeof root[pathStep] === 'undefined')
                        root[pathStep] = {};

                    root = root[pathStep];
                }

                return root;
            },
            joinTip: function (arr) {
                if (!arr) {
                    return arr;
                }

                var lines = arr.map(function (line) {
                    var rtrimmed = line.replace(/\s+$/g, '');

                    if (rtrimmed.indexOf('>', this.length - 1) == -1) {
                        rtrimmed = rtrimmed + '<br/>';
                    }

                    return rtrimmed;
                });

                return lines.join('');
            },
            mkOptions: function (options) {
                return _.map(options, function (option) {
                    return {value: option, label: option};
                });
            },
            isDefined: isDefined,
            isEmptyArray: isEmptyArray,
            isEmptyString: isEmptyString,
            errorMessage: errorMessage,
            showError: showError,
            showInfo: function (msg) {
                if (msgModal)
                    msgModal.hide();

                msgModal = $alert({
                    type: 'success',
                    title: msg,
                    duration: 2
                });
            },
            JDBC_TYPES: JDBC_TYPES,
            javaBuildInClasses: javaBuildInClasses,
            isJavaBuildInClass: isJavaBuildInClass,
            isValidJavaIdentifier: isValidJavaIdentifier,
            isValidJavaClass: function (msg, ident, allowBuildInClass) {
                if (isEmptyString(ident))
                    return showError(msg + ' could not be empty!');

                var parts = ident.split('.');

                var len = parts.length;

                if (!allowBuildInClass && isJavaBuildInClass(ident))
                    return showError(msg + ' should not be the Java build-in class!');

                if (len < 2 && !isJavaBuildInClass(ident))
                    return showError(msg + ' does not have package specified!');

                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];

                    if (!isValidJavaIdentifier(msg, part))
                        return false;
                }

                return true;
            },
            /**
             * Calculate available width for text in link to edit element.
             *
             * @param id Id of contains link table.
             * @returns {*[]} First element is length of class for single value, second element is length for pair vlaue.
             */
            availableWidth: function (id) {
                var div = $('#' + id).find('div')[0];
                var width = div.clientWidth;

                if (width > 0) {
                    var children = div.childNodes;

                    for (var i = 1; i < children.length; i++) {
                        var child = children[i];

                        if ('offsetWidth' in child)
                            width -= children[i].offsetWidth;
                    }

                    width -= measureText('99) ');
                }

                return [width | 0, (width > 0 ? (width - measureText(' / ')) / 2 | 0 : width) | 0];
            },
            /**
             * Cut class name by width in pixel or width in symbol count.
             *
             * @param s Class name to cut.
             * @param maxLength Maximum length in symbols.
             * @param maxWidth Maximum length in pixels.
             * @returns Cutted class name.
             */
            compactJavaName: function (s, maxLength, maxWidth) {
                try {
                    // HTML5 calculation of showed message width.
                    return compactByMaxPixels(s, maxWidth)
                }
                catch (err) {
                    return compactByMaxCharts(s, maxLength)
                }
            },
            ensureActivePanel: function (panels, pnlIdx) {
                if (panels) {
                    var activePanels = panels.activePanels;

                    if (!activePanels || activePanels.length < 1)
                        panels.activePanels = [pnlIdx];
                    else if (!_.contains(activePanels, pnlIdx)) {
                        var newActivePanels = activePanels.slice();

                        newActivePanels.push(pnlIdx);

                        panels.activePanels = newActivePanels;
                    }
                }
            }
        }
    }]);

// Confirm popup service.
controlCenterModule.service('$confirm', function ($modal, $rootScope, $q) {
    var scope = $rootScope.$new();

    var deferred;

    scope.ok = function () {
        deferred.resolve();

        confirmModal.hide();
    };

    var confirmModal = $modal({templateUrl: '/confirm', scope: scope, placement: 'center', show: false});

    var parentShow = confirmModal.show;

    confirmModal.show = function (content) {
        scope.content = content || 'Confirm deletion?';

        deferred = $q.defer();

        parentShow();

        return deferred.promise;
    };

    return confirmModal;
});

// 'Save as' popup service.
controlCenterModule.service('$copy', function ($modal, $rootScope, $q) {
    var scope = $rootScope.$new();

    var deferred;

    scope.ok = function (newName) {
        deferred.resolve(newName);

        copyModal.hide();
    };

    var copyModal = $modal({templateUrl: '/copy', scope: scope, placement: 'center', show: false});

    var parentShow = copyModal.show;

    copyModal.show = function (oldName) {
        scope.newName = oldName + '(1)';

        deferred = $q.defer();

        parentShow();

        return deferred.promise;
    };

    return copyModal;
});

// Tables support service.
controlCenterModule.service('$table', [
    '$common', function ($common) {
        function _swapSimpleItems(a, ix1, ix2) {
            var tmp = a[ix1];

            a[ix1] = a[ix2];
            a[ix2] = tmp;
        }

        function _model(item, field) {
            return $common.getModel(item, field);
        }

        var table = {name: 'none', editIndex: -1};

        function _tableReset() {
            table.name = 'none';
            table.editIndex = -1;
        }

        function _tableState(name, editIndex) {
            table.name = name;
            table.editIndex = editIndex;
        }

        return {
            tableState: function (name, editIndex) {
                _tableState(name, editIndex);
            },
            tableReset: function () {
                _tableReset();
            },
            tableNewItem: function (field) {
                _tableState(field.model, -1);
            },
            tableNewItemActive: function (field) {
                return table.name == field.model && table.editIndex < 0;
            },
            tableEditing: function (field, index) {
                return table.name == field.model && table.editIndex == index;
            },
            tableStartEdit: function (item, field, index) {
                _tableState(field.model, index);

                return _model(item, field)[field.model][index];
            },
            tableRemove: function (item, field, index) {
                _tableReset();

                _model(item, field)[field.model].splice(index, 1);
            },
            tableSimpleSave: function (valueValid, item, field, newValue, index) {
                if (valueValid(item, field, newValue, index)) {
                    _tableReset();

                    if (index < 0) {
                        if (_model(item, field)[field.model])
                            _model(item, field)[field.model].push(newValue);
                        else
                            _model(item, field)[field.model] = [newValue];
                    }
                    else
                        _model(item, field)[field.model][index] = newValue;
                }
            },
            tableSimpleSaveVisible: function (newValue) {
                return !$common.isEmptyString(newValue);
            },
            tableSimpleUp: function (item, field, index) {
                _tableReset();

                _swapSimpleItems(_model(item, field)[field.model], index, index - 1);
            },
            tableSimpleDown: function (item, field, index) {
                _tableReset();

                _swapSimpleItems(_model(item, field)[field.model], index, index + 1);
            },
            tableSimpleDownVisible: function (item, field, index) {
                return index < _model(item, field)[field.model].length - 1;
            },
            tablePairSave: function (pairValid, item, field, newKey, newValue, index) {
                if (pairValid(item, field, newKey, newValue, index)) {
                    _tableReset();

                    var pair = {};

                    if (index < 0) {
                        pair[field.keyName] = newKey;
                        pair[field.valueName] = newValue;

                        if (item[field.model])
                            item[field.model].push(pair);
                        else
                            item[field.model] = [pair];
                    }
                    else {
                        pair = item[field.model][index];

                        pair[field.keyName] = newKey;
                        pair[field.valueName] = newValue;
                    }
                }
            },
            tablePairSaveVisible: function (newKey, newValue) {
                return !$common.isEmptyString(newKey) && !$common.isEmptyString(newValue);
            }
        }
    }]);

// Filter to decode name using map(value, label).
controlCenterModule.filter('displayValue', function () {
    return function (v, m, dflt) {
        var i = _.findIndex(m, function (item) {
            return item.value == v;
        });

        if (i >= 0) {
            return m[i].label;
        }

        if (dflt) {
            return dflt;
        }

        return 'Unknown value';
    }
});

// Directive to enable validation for IP addresses.
controlCenterModule.directive('ipaddress', function () {
    const ip = '(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])';
    const port = '([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])';
    const portRange = '(:' + port + '(..' + port + ')?)?';
    const host = '(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])';

    return {
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {
            ctrl.$validators.ipaddress = function (modelValue, viewValue) {
                if (ctrl.$isEmpty(modelValue) || !attrs['ipaddress'])
                    return true;

                return viewValue.match(new RegExp('(^' + ip + portRange + '$)|(^' + host + portRange + '$)')) != null;
            }
        }
    }
});

// Directive to enable validation to match specified value.
controlCenterModule.directive('match', function ($parse) {
    return {
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {
            scope.$watch(function () {
                return $parse(attrs.match)(scope) === ctrl.$modelValue;
            }, function (currentValue) {
                ctrl.$setValidity('mismatch', currentValue);
            });
        }
    };
});

// Directive to bind ENTER key press with some user action.
controlCenterModule.directive('onEnter', function ($timeout) {
    return function (scope, elem, attrs) {
        elem.on('keydown keypress', function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    $timeout(function () {
                        scope.$eval(attrs.onEnter)
                    });
                });

                event.preventDefault();
            }
        });

        // Removes bound events in the element itself when the scope is destroyed
        scope.$on('$destroy', function () {
            elem.off('keydown keypress');
        });
    };
});

// Directive to bind ESC key press with some user action.
controlCenterModule.directive('onEscape', function () {
    return function (scope, elem, attrs) {
        elem.on('keydown keypress', function (event) {
            if (event.which === 27) {
                scope.$apply(function () {
                    scope.$eval(attrs.onEscape);
                });

                event.preventDefault();
            }
        });

        // Removes bound events in the element itself when the scope is destroyed
        scope.$on('$destroy', function () {
            elem.off('keydown keypress');
        });
    };
});

// Directive to retain selection. To fix angular-strap typeahead bug with setting cursor to the end of text.
controlCenterModule.directive('retainSelection', function ($timeout) {
    return function (scope, elem, attr) {
        elem.on('keydown', function (evt) {
            var key = evt.which;
            var ctrlDown = evt.ctrlKey || evt.metaKey;
            var input = this;
            var start = input.selectionStart;

            $timeout(function () {
                var setCursor = false;

                // Handle Backspace[8].
                if (key == 8 && start > 0) {
                    start -= 1;

                    setCursor = true;
                }
                // Handle Del[46].
                else if (key == 46)
                    setCursor = true;
                // Handle: Caps Lock[20], Tab[9], Shift[16], Ctrl[17], Alt[18], Esc[27], Enter[13], Arrows[37..40], Home[36], End[35], Ins[45], PgUp[33], PgDown[34], F1..F12[111..124], Num Lock[], Scroll Lock[145].
                else if (!(key == 9 || key == 13 || (key > 15 && key < 20) || key == 27 ||
                    (key > 32 && key < 41) || key == 45 || (key > 111 && key < 124) || key == 144 || key == 145)) {
                    // Handle: Ctrl + [A[65], C[67], V[86]].
                    if (!(ctrlDown && (key = 65 || key == 67 || key == 86))) {
                        start += 1;

                        setCursor = true;
                    }
                }

                if (setCursor)
                    input.setSelectionRange(start, start);
            });
        });

        // Removes bound events in the element itself when the scope is destroyed
        scope.$on('$destroy', function () {
            elem.off('keydown');
        });
    };
});

// Factory function to focus element.
controlCenterModule.factory('$focus', function ($timeout, $window) {
    return function (id) {
        // Timeout makes sure that is invoked after any other event has been triggered.
        // E.g. click events that need to run before the focus or inputs elements that are
        // in a disabled state but are enabled when those events are triggered.
        $timeout(function () {
            var elem = $window.document.getElementById(id);

            if (elem)
                elem.focus();
        });
    };
});

// Directive to focus next element on ENTER key.
controlCenterModule.directive('enterFocusNext', function ($focus) {
    return function (scope, elem, attrs) {
        elem.on('keydown keypress', function (event) {
            if (event.which === 13) {
                event.preventDefault();

                $focus(attrs.enterFocusNext);
            }
        });
    };
});

// Directive to mark elements to focus.
controlCenterModule.directive('eventFocus', function ($focus) {
    return function (scope, elem, attr) {
        elem.on('click', function () {
            $focus(attr.eventFocus);
        });

        // Removes bound events in the element itself when the scope is destroyed
        scope.$on('$destroy', function () {
            elem.off('click');
        });
    };
});

// Navigation bar controller.
controlCenterModule.controller('activeLink', [
    '$scope', function ($scope) {
        $scope.isActive = function (path) {
            return window.location.pathname.substr(0, path.length) == path;
        };
    }]);

// Login popup controller.
controlCenterModule.controller('auth', [
    '$scope', '$modal', '$http', '$window', '$common', '$focus',
    function ($scope, $modal, $http, $window, $common, $focus) {
        $scope.action = 'login';

        $scope.userDropdown = [{text: 'Profile', href: '/profile'}];

        if (!$scope.becomeUsed) {
            if ($scope.user && $scope.user.admin)
                $scope.userDropdown.push({text: 'Admin Panel', href: '/admin'});

            $scope.userDropdown.push({text: 'Log Out', href: '/logout'});
        }

        if ($scope.token && !$scope.error)
            $focus('user_password');

        // Pre-fetch modal dialogs.
        var loginModal = $modal({scope: $scope, templateUrl: '/login', show: false});

        // Show login modal.
        $scope.login = function () {
            loginModal.$promise.then(function () {
                loginModal.show();

                $focus('user_email');
            });
        };

        // Try to authorize user with provided credentials.
        $scope.auth = function (action, user_info) {
            $http.post('/' + action, user_info)
                .success(function () {
                    loginModal.hide();

                    $window.location = '/configuration/clusters';
                })
                .error(function (data, status) {
                    if (status == 403) {
                        loginModal.hide();

                        $window.location = '/reset';
                    }
                    else
                        $common.showError(data, 'top', '#errors-container');
                });
        };

        // Try to reset user password for provided token.
        $scope.resetPassword = function (reset_info) {
            $http.post('/reset_password', reset_info)
                .success(function (data) {
                    $scope.user_info = {email: data};
                    $scope.login();
                })
                .error(function (data, state) {
                    $common.showError(data);

                    if (state == 503) {
                        $scope.user_info = {};
                        $scope.login();
                    }
                });
        }
    }]);

// Navigation bar controller.
controlCenterModule.controller('notebooks', [
    '$scope', '$http', '$common', function ($scope, $http, $common) {
        $scope.notebooks = [];

        // When landing on the page, get clusters and show them.
        $http.post('/notebooks/list')
            .success(function (data) {
                $scope.notebooks = data;

                if ($scope.notebooks.length > 0) {
                    $scope.notebookDropdown = [
                        {text: 'Create new notebook', href: '/notebooks/new', target: '_self'},
                        {divider: true}
                    ];

                    _.forEach($scope.notebooks, function (notebook) {
                        $scope.notebookDropdown.push({
                            text: notebook.name,
                            href: '/sql/' + notebook._id,
                            target: '_self'
                        });
                    });
                }
            })
            .error(function (errMsg) {
                $common.showError(errMsg);
            });
    }]);
