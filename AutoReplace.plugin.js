/**
 * @name AutoReplace
 * @author p0rtL
 * @description Adds the option to set words to be replaced by user defined options
 * @version 1.0
*/

const config = {
    info: {
        name: "Auto Replace",
        authors: [
            {
                name: "p0rtL",
            }
        ],
        version: "1.0",
        description: "Adds the option to set words to be replaced by user defined options",
    }
};

/**
 * @param {[ZeresPluginLibrary.BasePlugin, ZeresPluginLibrary.PluginApi]} param0 
 * @returns 
*/

const buildPlugin = ([Plugin, Api]) => {
    const { Toasts, Logger, Patcher, Settings, Utilities, DOMTools, ReactTools, ReactComponents, DiscordModules, WebpackModules, DiscordSelectors } = Api;
    const { React, React: { useEffect, useState }, ElectronModule, GuildStore, ChannelStore, DiscordConstants: { ChannelTypes }, SelectedGuildStore } = Api.DiscordModules;
    const { SettingPanel, SettingGroup, SettingField, RadioGroup, Switch } = Settings;
    const { ComponentDispatch: Dispatcher } = WebpackModules.getByProps('ComponentDispatch');
    const SlateUtils = WebpackModules.getAllByProps('serialize', 'deserialize').find((mod) => Object.keys(mod).length === 2);

    const pluginCss = `
    .AutoReplace-Settings-Input * {
        width: 98%;
    }
    .AutoReplace-Settings-Delete {
        height: 20px;
        width: auto;
        color: white;
        position: relative;
        top: 5px;
        left: -2px;
    }
    .AutoReplace-Settings-Delete:hover {
        color: red;
    }
    .AutoReplace-Settings-Switches {
        width: 95%;
        justify-content: flex-end;
        display: inline-flex;
    }
    `

    function updateCss() {
        if (document.querySelector("bd-styles #AutoReplace")) BdApi.clearCSS("AutoReplace");
        BdApi.injectCSS("AutoReplace", pluginCss);
    }

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

    const button = BdApi.findModuleByProps("Button").Button;
    const SwitchItem = createUpdateWrapper(BdApi.findModuleByDisplayName("SwitchItem"));
    const TextInput = createUpdateWrapper(BdApi.findModuleByDisplayName("TextInput"));
    const Close = BdApi.findModuleByDisplayName('Close');

    const keywords = () => BdApi.getData("AutoReplace", "keywords")
    const toggles = () => BdApi.getData("AutoReplace", "toggles")
    const activeKeywords = () => {
        return Object.keys(keywords())
            .filter((key) => toggles()[key])
            .reduce((res, key) => (res[key] = keywords()[key], res), {})
    }

    if (typeof toggles() !== 'object') BdApi.saveData("AutoReplace", "toggles", {})

    function addReplacement() {
        let abbr = BdApi.getData("AutoReplace", "in1")
        let repl = BdApi.getData("AutoReplace", "in2")
        if (abbr && abbr.trim() !== "" && repl && repl.trim() !== "") {
            let newKeywords = keywords()
            newKeywords[abbr] = repl
            BdApi.saveData("AutoReplace", "keywords", newKeywords);
            let newToggles = toggles()
            newToggles[abbr] = true
            BdApi.saveData("AutoReplace", "toggles", newToggles);
        } else {
            BdApi.showToast("Invalid Input text", { type: "error" })
        }
    }

    const debounce = (fn, wait = 100) => {
        if (typeof fn !== 'function') fn = function () { };
        let timeout;
        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, arguments), wait);
        };
    };

    class SettingsPanel extends React.Component {

        constructor(props) {
            super(props)

        }

        render() {
            return React.createElement("div", {
                className: "AutoReplace-Settings-Wrapper",
                children: [
                    React.createElement("div", {
                        className: "AutoReplace-Settings-Input",
                        style: {
                            "display": "flex",
                            "justify-content": "space-between",
                        },
                        children: [
                            React.createElement(TextInput, {
                                value: BdApi.getData("AutoReplace", "in1"),
                                placeholder: "Abbreviation",
                                onChange: (value) => {
                                    BdApi.saveData("AutoReplace", "in1", value);
                                }
                            }),
                            React.createElement(TextInput, {
                                value: BdApi.getData("AutoReplace", "in2"),
                                placeholder: "Replacement Text",
                                style: {
                                    "margin-left": "5px",
                                },
                                onChange: (value) => {
                                    BdApi.saveData("AutoReplace", "in2", value);
                                }
                            })
                        ]
                    }),
                    React.createElement(button, {
                        onClick: () => {
                            addReplacement()
                            this.forceUpdate();
                        },
                        style: {
                            "margin-bottom": "10px",
                        },
                    }, "Add Replacement"),
                    React.createElement("div", {
                        className: "AutoReplace-Settings-Switches-Wrapper",
                        style: {
                            "max-height": "600px",
                        },
                        children: [
                            Object.keys(keywords()).map(key => React.createElement("div", {
                                className: "AutoReplace-Settings-Switches-Wrapper-Inner",
                                children: [
                                    React.createElement(Close, {
                                        className: "AutoReplace-Settings-Delete",
                                        onClick: () => {
                                            let delToggles = toggles()
                                            delete delToggles[key]
                                            BdApi.saveData("AutoReplace", "toggles", delToggles);
                                            let delKeywords = keywords()
                                            delete delKeywords[key]
                                            BdApi.saveData("AutoReplace", "keywords", delKeywords);
                                            this.forceUpdate();
                                        }
                                    }),
                                    React.createElement(SwitchItem, {
                                        className: "AutoReplace-Settings-Switches",
                                        value: toggles()[key],
                                        onChange: (value) => {
                                            let newToggles = toggles()
                                            newToggles[key] = value
                                            BdApi.saveData("AutoReplace", "toggles", newToggles);
                                        },
                                        children: [
                                            key + " ➜ " + keywords()[key],
                                        ]
                                    })
                                ]
                            }))
                        ]
                    }),
                ]
            })
        }

    }

    return class AutoReplace extends Plugin {

        getSettingsPanel = () => React.createElement(SettingsPanel, null)

        onStart() {
            updateCss()
            this.patchTextareaComponent();
        }

        onStop() {
            Patcher.unpatchAll();
        }

        getName() { return config.info.name; }
        getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
        getDescription() { return config.info.description; }
        getVersion() { return config.info.version; }

        patchTextareaComponent = () => {
            const EditArea = WebpackModules.getByDisplayName('ChannelEditorContainer');
            if (!EditArea) return;

            Patcher.after(EditArea.prototype, 'render', debounce((that, args, value) => {
                let text = that.props.textValue
                const textAreaRef = that.ref.current
                if (!text || !textAreaRef) return value;

                const filter = Object.keys(activeKeywords()).filter((val) => text.includes(val + "  ")).map(key => key + "  ")

                if (filter.length === 0) return value;

                for (let i = 0; i < filter.length; i++) {
                    text = text.replace(filter[i], activeKeywords()[filter[i].trim()])
                }

                textAreaRef.handleChange({ value: SlateUtils.deserialize(text) });
                textAreaRef.editorRef.moveToEndOfText();
                Dispatcher.dispatch('TEXTAREA_FOCUS', null);

                return value;
            }));
        }
    };
};

module.exports = window.hasOwnProperty("ZeresPluginLibrary")
    ? buildPlugin(window.ZeresPluginLibrary.buildPlugin(config))
    : class {
        getName() { return config.info.name; }
        getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
        getDescription() { return `${config.info.description}. __**ZeresPluginLibrary was not found! This plugin will not work!**__`; }
        getVersion() { return config.info.version; }
        load() {
            BdApi.showConfirmationModal(
                "Library plugin is needed",
                [`The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`],
                {
                    confirmText: "Download",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                            if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                            await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                        });
                    }
                }
            );
        }
        start() { }
        stop() { }
    };
