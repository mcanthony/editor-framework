// REF: http://webaim.org/techniques/keyboard/tabindex
EditorUI.focusable = (function () {

    //
    function _removeTabIndexRecursively ( el ) {
        if ( el.focused !== undefined && el._initTabIndex !== undefined ) {
            el.focused = false;
            el._removeTabIndex();
        }

        var elementDOM = Polymer.dom(el);
        for ( var i = 0; i < elementDOM.children.length; ++i ) {
            _removeTabIndexRecursively ( elementDOM.children[i] );
        }
    }

    function _initTabIndexRecursively ( el ) {
        if ( el.focused !== undefined && el._initTabIndex !== undefined ) {
            if ( el.disabled === false ) {
                el._initTabIndex();
            }
        }

        var elementDOM = Polymer.dom(el);
        for ( var i = 0; i < elementDOM.children.length; ++i ) {
            _initTabIndexRecursively ( elementDOM.children[i] );
        }
    }


    var focusable = {
        'ui-focusable': true,

        properties: {
            focused: {
                type: Boolean,
                value: false,
                reflectToAttribute: true,
                observer: '_focusedChanged',
            },

            disabled: {
                type: Boolean,
                value: false,
                reflectToAttribute: true,
                observer: '_disabledChanged',
            },

            noNavigate: {
                type: Boolean,
                value: false,
                reflectToAttribute: true,
            },
        },

        listeners: {
            'focusin': '_onFocusIn',
            'focusout': '_onFocusOut',
            'focus': '_onFocus',
            'blur': '_onBlur',
        },

        _initFocusable: function ( focusEls ) {
            if ( focusEls ) {
                if ( Array.isArray(focusEls) ) {
                    this.focusEls = focusEls;
                }
                else {
                    this.focusEls = [focusEls];
                }
            }
            else {
                this.focusEls = [];
            }

            this._initTabIndex();
        },

        _initTabIndex: function () {
            if ( !this.focusEls )
                return;

            var el, i;

            if ( this.noNavigate ) {
                for ( i = 0; i < this.focusEls.length; ++i ) {
                    el = this.focusEls[i];
                    el.tabIndex = -1;
                }
            }
            else {
                for ( i = 0; i < this.focusEls.length; ++i ) {
                    el = this.focusEls[i];
                    el.tabIndex = EditorUI.getParentTabIndex(this) + 1;
                }
            }
        },

        _removeTabIndex: function () {
            if ( !this.focusEls )
                return;

            for ( var i = 0; i < this.focusEls.length; ++i ) {
                var el = this.focusEls[i];
                el.removeAttribute('tabindex');
            }
        },

        _disabledInHierarchy: function () {
            if ( this.disabled )
                return true;

            var parent = Polymer.dom(this).parentNode;
            while ( parent ) {
                if ( parent.disabled )
                    return true;

                parent = Polymer.dom(parent).parentNode;
            }
            return false;
        },

        _focusedChanged: function () {
            if ( this.disabled ) {
                this.focused = false;
            }
        },

        _disabledChanged: function () {
            if ( this.disabled ) {
                this.style.pointerEvents = 'none';
                _removeTabIndexRecursively(this);
            }
            else {
                this.style.pointerEvents = '';
                _initTabIndexRecursively(this);
            }
        },

        _onFocusIn: function ( event ) {
            this.focused = true;
        },

        _onFocusOut: function ( event ) {
            this.focused = false;
        },

        _onFocus: function ( event ) {
            this.focused = true;
        },

        _onBlur: function ( event ) {
            this.focused = false;
        },

        setFocus: function () {
            if ( this._disabledInHierarchy() )
                return;

            if ( this.focusEls.length > 0 ) {
                this.focusEls[0].focus();
            }
            this.focused = true;
        },

        setBlur: function () {
            if ( this._disabledInHierarchy() )
                return;

            if ( this.focusEls.length > 0 ) {
                this.focusEls[0].blur();
            }
            this.focused = false;
        },
    };
    return focusable;
})();
