/**
 * @name DiscordEncryption
 * @author p0rtL
 * @description Automatically encrypt messages with rsa-aes hybrid encryption
 * @invite sRGX5VRwzQ
 * @authorId 258731845267619840
 * @source https://github.com/p0rtL6/BetterDiscord-Plugins
 * @website https://p0rtl-5db98.web.app/
 * @version 1.0 Alpha
 */

const config = {
    info: {
        name: "Discord Encryption",
        authors: [
            {
                name: "p0rtL",
                discord_id: "258731845267619840",
                github_username: "p0rtL6",
            },
        ],
        version: "1.0 Alpha",
        description:
            "Automatically encrypt messages with rsa-aes hybrid encryption",
        github: "https://github.com/p0rtL6/BetterDiscord-Plugins",
        github_raw:
            "https://raw.githubusercontent.com/p0rtL6/BetterDiscord-Plugins/dev/denc.plugin.js",
    },
};

/**
 * @param {[ZeresPluginLibrary.BasePlugin, ZeresPluginLibrary.PluginApi]} param0
 * @returns
 */

const buildPlugin = ([Plugin, Api]) => {
    const {
        Toasts,
        Logger,
        Patcher,
        Settings,
        Utilities,
        DOMTools,
        ReactTools,
        ReactComponents,
        DiscordModules,
        WebpackModules,
        DiscordSelectors,
    } = Api;
    const {
        React,
        React: { useEffect, useState },
        ElectronModule,
        GuildStore,
        ChannelStore,
        DiscordConstants: { ChannelTypes },
        SelectedGuildStore,
    } = Api.DiscordModules;
    const { SettingPanel, SettingGroup, SettingField, RadioGroup, Switch } =
        Settings;
    const { ComponentDispatch: Dispatcher } =
        WebpackModules.getByProps("ComponentDispatch");
    const uploadUtils = BdApi.findModuleByProps("upload", "instantBatchUpload");
    const SlateUtils = WebpackModules.getAllByProps(
        "serialize",
        "deserialize"
    ).find(mod => Object.keys(mod).length === 2);
    const ChannelAttachMenu = BdApi.findModule(
        m => m?.default?.displayName === "ChannelAttachMenu"
    );
    const channel = BdApi.findModuleByProps("getLastSelectedChannelId");
    const MenuItem = BdApi.findModuleByProps("MenuItem");
    const crypto = require("crypto");
    const fs = require("fs");
    let mText;

    const publicKey = fs.readFileSync(
        BdApi.Plugins.folder + "/denc/denc_rsa.pub"
    );
    const privateKey = fs.readFileSync(BdApi.Plugins.folder + "/denc/denc_rsa");
    const publicKey2 = fs.readFileSync(
        BdApi.Plugins.folder + "/denc/denc_rsa2.pub"
    );
    const privateKey2 = fs.readFileSync(
        BdApi.Plugins.folder + "/denc/denc_rsa2"
    );
    const publicKey3 = fs.readFileSync(
        BdApi.Plugins.folder + "/denc/denc_rsa3.pub"
    );
    const privateKey3 = fs.readFileSync(
        BdApi.Plugins.folder + "/denc/denc_rsa3"
    );

    const splitChunks = (str, interval) => {
        const chunks = [];

        for (
            let i = 0, charsLength = str.length;
            i < charsLength;
            i += interval
        )
            chunks.push(str.substring(i, i + interval));

        return chunks;
    };

    const encrypt = (text, key, iv, publicKeys) => {
        const cipher = () => crypto.createCipheriv("aes-256-ctr", key, iv);

        const encryptedKeys = publicKeys.map(publicKey => {
            return crypto
                .publicEncrypt(
                    {
                        key: publicKey,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                        oaepHash: "sha256",
                    },
                    key
                )
                .toString("base64");
        });

        function HashObj() {
            this.iv = iv.toString("hex");
            this.ky = encryptedKeys;
            this.ct = "";
        }

        const interval =
            ((2000 - JSON.stringify(new HashObj()).length) * 3) / 4 - 2;

        return splitChunks(text, interval).map(chunk => {
            const newObj = new HashObj();
            newObj.ct = Buffer.concat([
                cipher().update(chunk),
                cipher().final(),
            ]).toString("base64");
            return newObj;
        });
    };

    const decrypt = (hash, privateKey) => {
        const ivBuffer = Buffer.from(hash.iv, "hex");
        const ctBuffer = Buffer.from(hash.ct, "base64");
        return hash.ky
            .map(key => {
                try {
                    const decryptedKey = crypto.privateDecrypt(
                        {
                            key: privateKey,
                            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                            oaepHash: "sha256",
                        },
                        Buffer.from(key, "base64")
                    );

                    const decipher = crypto.createDecipheriv(
                        "aes-256-ctr",
                        decryptedKey,
                        ivBuffer
                    );

                    const decrypted = Buffer.concat([
                        decipher.update(ctBuffer),
                        decipher.final(),
                    ]);

                    return decrypted.toString();
                } catch {
                    return;
                }
            })
            .find(key => (key ? true : false));
    };

    const createUpdateWrapper =
        (Component, valueProp = "value", changeProp = "onChange") =>
        props => {
            const [value, setValue] = BdApi.React.useState(props[valueProp]);
            return BdApi.React.createElement(Component, {
                ...props,
                [valueProp]: value,
                [changeProp]: value => {
                    if (typeof props[changeProp] === "function")
                        props[changeProp](value);
                    setValue(value);
                },
            });
        };

    const debounce = (fn, wait = 100) => {
        if (typeof fn !== "function") fn = function () {};
        let timeout;
        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, arguments), wait);
        };
    };

    class SettingsPanel extends React.Component {
        constructor(props) {
            super(props);
        }

        render() {
            return null;
        }
    }

    return class DiscordEncryption extends Plugin {
        getName() {
            return config.info.name;
        }
        getAuthor() {
            return config.info.authors.map(a => a.name).join(", ");
        }
        getDescription() {
            return config.info.description;
        }
        getVersion() {
            return config.info.version;
        }

        getSettingsPanel = () => React.createElement(SettingsPanel, null);

        onStart() {
            this.TextareaComponentPatch();
            this.ChannelAttachMenuPatch();
        }

        onStop() {
            Patcher.unpatchAll();
        }

        ChannelAttachMenuPatch = () => {
            Patcher.after(ChannelAttachMenu, "default", (that, args, value) => {
                const [props] = args;
                value.props.children.push(
                    React.createElement(MenuItem.MenuItem, {
                        label: "Encrypt Message",
                        id: "denc-encrypt-message",
                        action: this.encryptMessage,
                    })
                );
                return value;
            });
        };

        uploadFile = () => {
            uploadUtils.upload(
                channel.getChannelId(),
                new File(
                    [
                        Buffer.from(
                            JSON.stringify(
                                encrypt(
                                    mText,
                                    crypto.randomBytes(32),
                                    crypto.randomBytes(16),
                                    [publicKey, publicKey2, publicKey3]
                                )[0]
                            )
                        ),
                    ],
                    "EncMessage.json",
                    { type: "application/json" }
                )
            );
        };

        encryptMessage = () => {
            if (!mText)
                return BdApi.showToast("Message Box Is Empty", {
                    type: "error",
                });
            BdApi.showConfirmationModal(
                "Encrypt Message",
                React.createElement("div", {
                    id: "denc-encrypt-popup-wrapper",
                    children: [],
                }),
                {
                    confirmText: "Encrypt",
                    onConfirm: this.uploadFile,
                }
            );
        };

        TextareaComponentPatch = () => {
            const EditArea = WebpackModules.getByDisplayName(
                "ChannelEditorContainer"
            );
            if (!EditArea) return;

            Patcher.after(
                EditArea.prototype,
                "render",
                debounce((that, args, value) => {
                    let text = that.props.textValue;
                    const textAreaRef = that.ref.current;
                    if (!text || !textAreaRef) return value;

                    mText = text;

                    return value;

                    textAreaRef.handleChange({
                        value: SlateUtils.deserialize(text),
                    });
                    textAreaRef.editorRef.moveToEndOfText();
                    Dispatcher.dispatch("TEXTAREA_FOCUS", null);

                    return value;
                })
            );
        };
    };
};

module.exports = window.hasOwnProperty("ZeresPluginLibrary")
    ? buildPlugin(window.ZeresPluginLibrary.buildPlugin(config))
    : class {
          getName() {
              return config.info.name;
          }
          getAuthor() {
              return config.info.authors.map(a => a.name).join(", ");
          }
          getDescription() {
              return `${config.info.description}. __**ZeresPluginLibrary was not found! This plugin will not work!**__`;
          }
          getVersion() {
              return config.info.version;
          }
          load() {
              BdApi.showConfirmationModal(
                  "Library plugin is needed",
                  [
                      `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`,
                  ],
                  {
                      confirmText: "Download",
                      cancelText: "Cancel",
                      onConfirm: () => {
                          require("request").get(
                              "https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js",
                              async (error, response, body) => {
                                  if (error)
                                      return require("electron").shell.openExternal(
                                          "https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js"
                                      );
                                  await new Promise(r =>
                                      require("fs").writeFile(
                                          require("path").join(
                                              BdApi.Plugins.folder,
                                              "0PluginLibrary.plugin.js"
                                          ),
                                          body,
                                          r
                                      )
                                  );
                                  BdApi.showConfirmationModal(
                                      "Library Succesfully installed",
                                      ["Please Reload Discord"],
                                      {
                                          confirmText: "Reload",
                                          cancelText: "cancel",
                                          onConfirm: () => {
                                              BdApi.Plugins.enable(
                                                  "ZeresPluginLibrary"
                                              );
                                              location.reload();
                                          },
                                      }
                                  );
                              }
                          );
                      },
                  }
              );
          }
          start() {}
          stop() {}
      };
