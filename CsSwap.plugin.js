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
    var switchArr = []
    getFiles().map(i=> {
        let temp = BdApi.React.createElement(SwitchItem, {
            value: BdApi.getData("CsSwap", i),
            onChange: (value) => {
                BdApi.saveData("CsSwap", i, value);
                watcher.close()
                toggled = patch()
                watchMutate(toggled)
            }
        }, i)
        switchArr.push(temp)
    });
    return switchArr
}

function patch() {
    let toggled = getToggled()
    let contents = getCSS(toggled)
    injectCSS(contents)
    return toggled
}

function getToggled() {
    var toggleArr = []
    getFiles().map(i=> {
        if (BdApi.getData("CsSwap", i) == true) {
            toggleArr.push(i)
        }
      });
    return toggleArr
}

function getFiles() {
    return fs.readdirSync(path.resolve(__dirname, `./css/`))
}

function getCSS(toggled) {
    var cssArr = []
    toggled.map(i=> {
        let contents = fs.readFileSync(path.resolve(__dirname, `./css/${i}`));
        cssArr.push(contents)
      });
    
    return cssArr
}

function injectCSS(contents) {
    var fullCss = ""
    contents.map(i=> {
        fullCss += i
      });
    if (document.querySelector("bd-styles #CsSwap")) {
        BdApi.clearCSS("CsSwap");
        BdApi.injectCSS("CsSwap", `${fullCss}`);
    } else { 
        BdApi.injectCSS("CsSwap", `${fullCss}`); 
    }
}

function watchMutate(toggled) {
    watcher = fs.watch(path.resolve(__dirname, './css'), (filename) => {
        if (toggled.includes(filename)) {
            patch()
        }
    })
}
