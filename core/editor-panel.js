var Ipc = require('ipc');
var BrowserWindow = require('browser-window');

/**
 * Redirect panel messages to its registered windows.
 */
var Panel = {};
var _panelIDToWindows = {};
var _panelIDToArgv = {};

Ipc.on('panel:ready', function ( reply, panelID ) {
    if ( !panelID ) {
        Editor.error( 'Invalid panelID ' + panelID );
        reply( {} );
        return;
    }

    var pair = panelID.split('@');
    if ( pair.length !== 2 ) {
        Editor.error( 'Invalid panelID ' + panelID );
        reply( {} );
        return;
    }

    var panelName = pair[0];
    var packageName = pair[1];

    var packageInfo = Editor.PackageManager.getPackageInfo(packageName);
    if ( !packageInfo ) {
        Editor.error( 'Invalid package info ' + packageName );
        reply( {} );
        return;
    }

    // TODO: remove fireball

    if ( !packageInfo.fireball ) {
        Editor.error( 'Invalid package info %s, can not find fireball property', packageName );
        reply( {} );
        return;
    }

    if ( !packageInfo.fireball.panels ) {
        Editor.error( 'Invalid package info %s, can not find panels property', packageName );
        reply( {} );
        return;
    }

    if ( !packageInfo.fireball.panels[panelName] ) {
        Editor.error( 'Invalid package info %s, can not find %s property', packageName, panelName );
        reply( {} );
        return;
    }

    var panelInfo = packageInfo.fireball.panels[panelName];
    var path = Editor.PackageManager.getPackagePath(packageName);
    var argv = _panelIDToArgv[panelID];

    reply({
        'panel-id': panelID,
        'panel-info': panelInfo,
        'package-path': path,
        'argv': argv
    });
});

Ipc.on('panel:dock', function ( event, panelID ) {
    var browserWin = BrowserWindow.fromWebContents( event.sender );
    var editorWin = Editor.Window.find(browserWin);
    Panel.dock( panelID, editorWin );
});

Ipc.on('panel:undock', function ( event, panelID ) {
    var browserWin = BrowserWindow.fromWebContents( event.sender );
    var editorWin = Editor.Window.find(browserWin);
    Panel.undock( panelID, editorWin );
});

Ipc.on('panel:query-settings', function ( reply, detail ) {
    var panelID = detail.id;
    var settings = detail.settings;

    settings = Editor.loadProfile( panelID, 'global', settings );
    reply(settings);
});

//
Ipc.on('panel:save-settings', function ( detail ) {
    var panelID = detail.id;
    var settings = detail.settings;

    var profile = Editor.loadProfile( panelID, 'global' );
    if ( profile ) {
        var save = profile.save;
        profile = settings;
        profile.save = save;

        profile.save();
    }
});

//
Panel.open = function ( packageName, panelName, panelInfo, argv ) {
    var id = panelName + '@' + packageName;
    _panelIDToArgv[id] = argv;

    var editorWin = Panel.findWindow(packageName, panelName);
    if ( editorWin ) {
        // if we find window by ID, send panel:open to it
        Editor.sendToPanel( packageName, panelName, 'panel:open', argv );
        editorWin.show();
        editorWin.focus();
        return;
    }

    //
    var windowName = 'editor-window-' + new Date().getTime();
    var options = {
        'use-content-size': true,
        'width': panelInfo.width,
        'height': panelInfo.height,
        'min-width': panelInfo['min-width'],
        'min-height': panelInfo['min-height'],
        'max-width': panelInfo['max-width'],
        'max-height': panelInfo['max-height'],
    };

    // load layout-settings, and find windows by name
    var profile = Editor.loadProfile('layout', 'local' );
    var panels = profile.panels;
    if ( profile.panels && profile.panels[id] ) {
        var panelProfile = profile.panels[id];
        windowName = panelProfile.window;

        // find window by name
        editorWin = Editor.Window.find(windowName);
        if ( editorWin ) {
            // TODO: ??? how can I dock it???
            return;
        }

        options.x = panelProfile.x;
        options.y = panelProfile.y;
        options.width = panelProfile.width;
        options.height = panelProfile.height;
    }

    // create new window
    var url = 'editor://static/window.html';
    // DISABLE: currently, I don't want to support page
    // if ( panelInfo.page ) {
    //     url = panelInfo.page;
    // }

    var winType = panelInfo.type || 'dockable';
    switch ( panelInfo.type ) {
    case 'dockable':
        options.resizable = true;
        options['always-on-top'] = false;
        break;

    case 'float':
        options.resizable = true;
        options['always-on-top'] = true;
        break;

    case 'fixed-size':
        options.resizable = false;
        options['always-on-top'] = true;
        // NOTE: fixed-size window always use package.json settings
        options.width = panelInfo.width;
        options.height = panelInfo.height;
        break;
    }

    //
    editorWin = new Editor.Window(windowName, options);
    // BUG: https://github.com/atom/atom-shell/issues/1321
    editorWin.nativeWin.setContentSize( options.width, options.height );
    editorWin.nativeWin.setMenuBarVisibility(false);
    editorWin.load(url, {
        panelID: id
    });
    editorWin.focus();
};

Panel.findWindow = function ( packageName, panelName ) {
    var id = panelName + '@' + packageName;
    return _panelIDToWindows[id];
};

Panel.findWindows = function (packageName) {
    var wins = [];

    for ( var p in _panelIDToWindows ) {
        var pair = p.split('@');
        if ( pair.length !== 2 ) {
            continue;
        }

        var name = pair[1];
        if ( name === packageName ) {
            var editorWin = _panelIDToWindows[p];
            if ( wins.indexOf (editorWin) === -1 )
                wins.push(editorWin);
        }
    }

    return wins;
};

Panel.findPanels = function ( packageName ) {
    var panels = [];
    for ( var p in _panelIDToWindows ) {
        var pair = p.split('@');
        if ( pair.length !== 2 ) {
            continue;
        }

        var name = pair[1];
        if ( name === packageName ) {
            panels.push(pair[0]);
        }
    }

    return panels;
};

Panel.dock = function ( panelID, win ) {
    // Editor.hint('dock %s', panelID ); // DEBUG
    _panelIDToWindows[panelID] = win;
};

Panel.undock = function ( panelID, win ) {
    // Editor.hint('undock %s', panelID ); // DEBUG
    var editorWin = _panelIDToWindows[panelID];
    if ( editorWin === win )
        return delete _panelIDToWindows[panelID];
    return false;
};

// TODO: we need to check if the windows panel only have that panel so that we can close the window
Panel.closeAll = function (packageName) {
    Editor.warn('TODO: @Johnny please implement Panel.closeAll');

    // var wins = Panel.findWindows(packageName);
    // for (var i = 0; i < wins.length; i++) {
    //     var win = wins[i];
    //     win.close();
    // }
    // delete _panelIDToWindows[...];
};

// NOTE: this only invoked in fire-window on-closed event
Panel._onWindowClosed = function ( editorWin ) {
    for ( var id in _panelIDToWindows ) {
        var win = _panelIDToWindows[id];
        if ( win === editorWin ) {
            delete _panelIDToWindows[id];
        }
    }
};

module.exports = Panel;