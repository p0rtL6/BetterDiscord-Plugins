/**
 * @name CsSwap
 * @author p0rtL
 * @description Allows for the usage of multiple custom css files
 * @version 1.0
 */

const path = require("path");
const fs = require("fs");
var watcher

const createUpdateWrapper = (Component, valueProp = "value", changeProp = "onChange") => props => {
    const [value, setValue] = BdApi.React.useState(props[valueProp]);
    return BdApi.React.createElement(Component, {
      ...props,
      [valueProp]: value,
      [changeProp]: value => {
        if (typeof props[changeProp] === "function") props[changeProp](value);
        setValue(value);
      }
    });
}

const SwitchItem = createUpdateWrapper(BdApi.findModuleByDisplayName("SwitchItem"));

module.exports = class CsSwap {
    load() { }
    start() {
        var toggled = patch()
        watchMutate(toggled)
    }
    stop() {
        BdApi.clearCSS("CsSwap");
        watcher.close()
    }
    getSettingsPanel() {
        return settingsPanel()
	}
}

function settingsPanel() {
    return getFiles().map(i => BdApi.React.createElement(SwitchItem, {
        value: BdApi.getData("CsSwap", i),
        onChange: (value) => {
            BdApi.saveData("CsSwap", i, value);
            watcher.close()
            toggled = patch()
            watchMutate(toggled)
        }
    }, i));
}

function patch() {
    let toggled = getFiles().filter(e => BdApi.getData("CsSwap", e));
    let contents = toggled.map(e => fs.readFileSync(path.resolve(__dirname, `./css/${e}`)))
    injectCSS(contents)
    return toggled
}

function getFiles() {
    return fs.readdirSync(path.resolve(__dirname, `./css/`))
}

function injectCSS(contents) {
    const fullCss = contents.join("\n");
    if (document.querySelector("bd-styles #CsSwap")) {
        BdApi.clearCSS("CsSwap");
        BdApi.injectCSS("CsSwap", `${fullCss}`);
    } else { 
        BdApi.injectCSS("CsSwap", `${fullCss}`); 
    }
}

function watchMutate(toggled) {
    watcher = fs.watch(path.resolve(__dirname, './css'), (eventType, filename) => {
        if (toggled.includes(filename)) {
            patch()
        }
    })
}
