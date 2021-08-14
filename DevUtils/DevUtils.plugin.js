/**
 * @name DevUtils
 * @author p0rtL
 * @description Basic Developer tools for BD
 * @version 1.0 Alpha
 */


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

const {React} = BdApi;
const Button = BdApi.findModuleByProps("Button").Button;
const zLibModules = Object.keys(ZLibrary.DiscordModules);
const SettingsView = BdApi.findModuleByDisplayName("SettingsView");
const menuTimes = ["Select Module", "button", "TextInput", "Custom Input"];
const TextInput = createUpdateWrapper(BdApi.findModuleByDisplayName("TextInput"));
const Dropdown = createUpdateWrapper(BdApi.findModuleByProps("SingleSelect").SingleSelect);

class ErrorBoundary extends React.Component {
    constructor(props) {
    super(props);
    this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        logErrorToMyService(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            BdApi.showToast("Something Went Wrong", { type: "error" })
            return null
        }

        return this.props.children; 
    }
}

function updateCss() {
    if (document.querySelector("bd-styles #DevUtils")) {
        BdApi.clearCSS("DevUtils");
        BdApi.injectCSS("DevUtils", `@import url(https://p0rtl6.github.io/BetterDiscord-Plugins/DevUtils/styles.css)`);
    }
    else { BdApi.injectCSS("DevUtils", `@import url(https://p0rtl6.github.io/BetterDiscord-Plugins/DevUtils/styles.css)`); }
}

module.exports = class DevUtils {
    load() { }
    start() {
        updateCss()

        const Store = this._userSettingsStore = BdApi.findModule(m=>m.toString().indexOf("useStore") > -1);
        
        function StoreWrapper() {
            const element = Store(state => state.element);

            return React.createElement(ErrorBoundary, null, element);
        }; StoreWrapper.forceUpdate = () => {};

        function searchModules() {
            let res = {}
            let query = BdApi.getData("DevUtils", "ModuleSearch")
            if (zLibModules.includes(query)) {
                res.title = "Found Webpack Module"
                res.module = ZLibrary.DiscordModules[query]
                res.access = ` ZLibrary.DiscordModules.${query}`
            } else {
                if (BdApi.findModuleByDisplayName(query)) {
                    res.title = "Found Module"
                    res.module = BdApi.findModuleByDisplayName(query)
                    res.access = `BdApi.findModuleByDisplayName('${query}')`
                }
                else if (BdApi.findModuleByProps(query)) {
                    res.title = "Found Module"
                    res.module = BdApi.findModuleByProps(query)
                    res.access = `BdApi.findModuleByProps('${query}')`
                } 
                else if (BdApi.findModule((m) => m?.default?.displayName === query)) {
                    res.title = "Found Module"
                    res.module = BdApi.findModule((m) => m?.default?.displayName === query)
                    res.access = `BdApi.findModule((m) => m?.default?.displayName === '${query}')`
                }
                else {
                    res.title = "No Module Found"
                    res.module = "No Module"
                    res.access = `No Module`
                }
            }
            
            BdApi.showConfirmationModal(res.title, React.createElement(popupContent, {
                res: res
            }), {
                confirmText: "close",
            });
        }

        function buildMenu(menuTimes) {
            var menuOptions = menuTimes.map((item) => {
                return {
                    label: item,
                    value: item
                };
            })
            return menuOptions
        }
        
        class popupContent extends React.Component {

            constructor(props) {
                super(props)
                this.state = {  }
                BdApi.saveData("DevUtils", "ModuleSearchEditable", this.props.res.access);
            }

            render() {
                const responseTitle = React.createElement("h1", {
                    style: {
                        color: "#ddd",
                        fontSize: 20,
                        marginBottom: "10px"
                    }
                }, "Module Accessible by:");

                const responseAccess = React.createElement(TextInput, {
                    style: {
                        color: "#ddd",
                        fontSize: 15,
                        height: "44px"
                    },
                    value: BdApi.getData("DevUtils", "ModuleSearchEditable"),
                    onChange: (value) => {
                        BdApi.saveData("DevUtils", "ModuleSearchEditable", value);
                    }
                })

                const viewModule = React.createElement(Button, {
                    onClick: () => {
                        console.log(this.props.res.module)
                        BdApi.showToast("Open the console to view the module")
                    },
                    style: {
                        marginBottom: "10px",
                        width: "20%"
                    }
                }, "View Module")

                var container = React.createElement('div', {
                    id: "DevUtilsModalContainer"
                }, responseTitle, responseAccess, viewModule);
                return container;
            }   
        }

        class createUtilsPanel extends React.Component {

            constructor(props) {
                super(props)
                this.state = { inputVisibility: "hidden", inputWidth: "0px" }
                BdApi.saveData("DevUtils", "ModuleDropdown", "Select Module")
            }

            render() {

                return React.createElement(
                    "div",
                    {
                    id: "DevUtilsWrapper"
                    },
                    React.createElement("h1", {
                                style: {
                                    color: "#ddd",
                                    marginBottom: 10,
                                    fontSize: 50,
                                    fontWeight: "bold"
                                }
                            }, "Developer Utilities"),
                    React.createElement("hr", {
                        style: {
                            "border": "0",
                            "border-top": "3px solid #ddd",
                            marginBottom: 20,
                        }
                    }),
                    React.createElement("h1", {
                        style: {
                            color: "#ddd",
                            marginBottom: 10,
                            fontSize: 20,
                            fontWeight: "bold"
                        }
                    }, "Search Modules"),
                    React.createElement(Dropdown, {
                        value: BdApi.getData("DevUtils", "ModuleDropdown"),
                        options: buildMenu(menuTimes),
                        onChange: (value) => {
                            BdApi.saveData("DevUtils", "ModuleDropdown", value);
                            if (value == "Custom Input") {
                                this.setState({ inputVisibility: "visible", inputWidth: "100%" })
                                BdApi.saveData("DevUtils", "ModuleSearch", this.state.search);
                            } else {
                                this.setState({ inputVisibility: "hidden", inputWidth: "0px" })
                                BdApi.saveData("DevUtils", "ModuleSearch", value);
                            }
                        }
                    }),
                    React.createElement(TextInput, {
                        value: BdApi.getData("DevUtils", "ModuleSearch"),
                        style: {
                            height: "44px",
                            visibility: this.state.inputVisibility,
                            width: this.state.inputWidth
                        },
                        onChange: (value) => {
                            BdApi.saveData("DevUtils", "ModuleSearch", value);
                            this.setState({ search: value })
                        }
                    }),
                    React.createElement(Button, {
                        onClick: searchModules,
                        style: {
                            width: "15%",
                        }
                    }, "Search"),
                    React.createElement(StoreWrapper, null)
                    );
            }
        }

        BdApi.Patcher.after("SettingsPatch", SettingsView.prototype, "componentDidMount", _this => {
            if (_this.props.sections.some(section => section.section === "devutils")) return;

            _this.props.sections.splice(_this.props.sections.findIndex(s => s.section === "Experiments"), 0, {
                section: "devutils",
                label: "Dev Utils",
                element: () => React.createElement(createUtilsPanel, null)
            });

            _this.forceUpdate();
        });
    }
    stop() {
        unpatchAll();
        if (document.querySelector("bd-styles #DevUtils")) { BdApi.clearCSS("DevUtils"); }
    }
    getSettingsPanel() { }
}

function unpatchAll() {
    BdApi.Patcher.unpatchAll("SettingsPatch");
}
