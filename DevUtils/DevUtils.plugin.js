/**
 * @name DevUtils
 * @author p0rtL
 * @description Basic Developer tools for BD
 * @version 1.0 Alpha
 */

const zLibModules = Object.keys(ZLibrary.DiscordModules)
const Markdown = BdApi.findModuleByProps("parseTopic");

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

const TextInput = createUpdateWrapper(BdApi.findModuleByDisplayName("TextInput"));
const Button = BdApi.findModuleByProps("Button").Button;

function updateCss() {
    if (document.querySelector("bd-styles #DevUtils")) {
        BdApi.clearCSS("DevUtils");
        BdApi.injectCSS("DevUtils", `@import url(https://p0rtl6.github.io/BetterDiscord-Plugins/DevUtils/styles.css)`);
    }
    else { BdApi.injectCSS("DevUtils", `@import url(https://p0rtl6.github.io/BetterDiscord-Plugins/DevUtils/styles.css)`); }
}

const {React} = BdApi;

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
            return BdApi.showToast("Something Went Wrong", { type: "error" })
        }

        return this.props.children; 
    }
}

module.exports = class DevUtils {
    load() { }
    start() {
        updateCss()
        const SettingsView = BdApi.findModuleByDisplayName("SettingsView");

        const Store = this._userSettingsStore = BdApi.findModule(m=>m.toString().indexOf("useStore") > -1);
        
        function StoreWrapper() {
            const element = Store(state => state.element);

            return React.createElement(ErrorBoundary, null, element);
        }; StoreWrapper.forceUpdate = () => {};

        function parseMd(body) {
            return Markdown.parse(`
            \`\`\`js
              ${body}
            \`\`\`
          `);
        }

        class popupContent extends React.Component {

            constructor(props) {
                super(props)
                this.state = { module: "" }
                BdApi.saveData("DevUtils", "ModuleSearchEditable", this.props.res.access);
            }

            showModule = () => {
                if (this.state.module === "") {
                    if (typeof(this.props.res.module) == "object") {
                    this.setState({ module: parseMd(JSON.stringify(this.props.res.module, undefined, 4)) })
                    } else {
                        this.setState({ module: parseMd(JSON.stringify(`${this.props.res.module}`, undefined, 4)) })
                    }
                } else {
                    this.setState({ module: "" })
                }
            }

            reparseModule = () => {
                let esModule = []
                let newModule = eval(BdApi.getData("DevUtils", "ModuleSearchEditable"))
                console.log(newModule)
                if (typeof(newModule) == "object") {
                    if (newModule.__esModule == true) {
                        for (const key in newModule) {
                            if (typeof(newModule[key]) == "object") {
                                esModule.push(JSON.stringify(newModule[key], undefined, 4))
                            } else {
                                esModule.push(JSON.stringify(`${newModule[key]}`, undefined, 4))
                            }
                        }
                        this.setState({ module: parseMd(JSON.stringify(esModule.join(), undefined, 4)) })
                    } else {
                        this.setState({ module: parseMd(JSON.stringify(newModule, undefined, 4)) })
                    }
                } else {
                        this.setState({ module: parseMd(JSON.stringify(`${newModule}`, undefined, 4)) })
                }
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
                        marginBottom: "10px",
                        height: "44px"
                    },
                    value: BdApi.getData("DevUtils", "ModuleSearchEditable"),
                    onChange: (value) => {
                        BdApi.saveData("DevUtils", "ModuleSearchEditable", value);
                    }
                })

                const updateModule = React.createElement(Button, {
                    onClick: this.reparseModule,
                    style: {
                        width: "20%"
                    }
                }, "Update")

                const viewModule = React.createElement(Button, {
                    onClick: this.showModule,
                    style: {
                        marginBottom: "10px"
                    }
                }, "View Module")

                const moduleContainer = React.createElement("h1", {}, this.state.module)

                var container = React.createElement('div', {
                    id: "DevUtilsModalContainer"
                }, responseTitle, responseAccess, updateModule, viewModule, moduleContainer);
                return container;
            }   
        }

        function searchModules() {
            let res = {}
            let query = BdApi.getData("DevUtils", "ModuleSearch")
            if (zLibModules.includes(query)) {
                res.title = "Found Webpack Module"
                res.module = ZLibrary.DiscordModules[query]
                res.access = ` ZLibrary.DiscordModules.${query}`
            } else {
                res.title = "Found Module"
                if (BdApi.findModuleByDisplayName(query)) {
                    res.module = BdApi.findModuleByDisplayName(query)
                    res.access = `BdApi.findModuleByDisplayName('${query}')`
                }
                else if (BdApi.findModuleByProps(query)) {
                    res.module = BdApi.findModuleByProps(query)
                    res.access = `BdApi.findModuleByProps('${query}')`
                } 
                else if (BdApi.findModule((m) => m?.default?.displayName === query)) {
                    res.module = BdApi.findModule((m) => m?.default?.displayName === query)
                    res.access = `BdApi.findModule((m) => m?.default?.displayName === '${query}')`
                }
            }
            
            BdApi.showConfirmationModal(res.title, React.createElement(popupContent, {
                res: res
            }), {
                confirmText: "close",
            });
        }

        function createUtilsPanel() {
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
                React.createElement(TextInput, {
                    value: BdApi.getData("DevUtils", "ModuleSearch"),
                    style: {
                        height: "44px"
                    },
                    onChange: (value) => {
                        BdApi.saveData("DevUtils", "ModuleSearch", value);
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

        BdApi.Patcher.after("SettingsPatch", SettingsView.prototype, "componentDidMount", _this => {
            if (_this.props.sections.some(section => section.section === "devutils")) return;

            _this.props.sections.splice(_this.props.sections.findIndex(s => s.section === "Experiments"), 0, {
                section: "devutils",
                label: "Dev Utils",
                element: () => createUtilsPanel()
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