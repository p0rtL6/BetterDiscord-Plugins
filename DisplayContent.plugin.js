/**
 * @name DisplayContent
 * @author p0rtL
 * @description Adds an option to display the contents of a url
 * @version 1.0
*/

var currentChannel

var active = {}
const https = require("https");
const urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
const MenuItem = BdApi.findModuleByProps("MenuItem");
const Markdown = BdApi.findModuleByProps("parseTopic");
const channel = BdApi.findModuleByProps('getChannelId');
const Dispatcher = BdApi.findModuleByProps("dirtyDispatch");
const MessageContent = BdApi.findModule((m) => m?.type?.displayName === "MessageContent");
const MessageContextMenu = BdApi.findModule((m) => m?.default?.displayName === "MessageContextMenu");
const langs = ['.feature', '.abap', '.adb', '.ads', '.ada', '.ahk', '.ahkl', '.htaccess', 'apache.conf', 'apache2.conf', '.applescript', '.as', '.as', '.asy', '.sh', '.ksh', '.bash', '.ebuild', '.eclass', '.bat', '.cmd', '.befunge', '.bmx', '.boo', '.bf', '.b', '.c', '.h', '.cfm', '.cfml', '.cfc', '.tmpl', '.spt', '.cl', '.lisp', '.el', '.clj', '.cljs', '.cmake', 'CMakeLists.txt', '.coffee', '.sh-session', 'control', '.cpp', '.hpp', '.c++', '.h++', '.cc', '.hh', '.cxx', '.hxx', '.pde', '.cs', '.css', '.pyx', '.pxd', '.pxi', '.d', '.di', '.pas', '.diff', '.patch', '.dpatch', '.darcspatch', '.duel', '.jbst', '.dylan', '.dyl', '.erb', '.erl-sh', '.erl', '.hrl', '.evoque', '.factor', '.flx', '.flxh', '.f', '.f90', '.s', '.S', '.kid', '.vert', '.frag', '.geo', '.plot', '.plt', '.go', '.(1234567)', '.man', '.haml', '.hs', '.html', '.htm', '.xhtml', '.xslt', '.hx', '.hy', '.hyb', '.ini', '.cfg', '.io', '.ik', '.weechatlog', '.jade', '.java', '.js', '.jsp', '.lhs', '.ll', '.lgt', '.lua', '.wlua', '.mak', 'Makefile', 'makefile', 'Makefile.', 'GNUmakefile', '.mao', '.maql', '.mhtml', '.mc', '.mi', 'autohandler', 'dhandler', '.md', '.mo', '.def', '.mod', '.moo', '.mu', '.mxml', '.myt', 'autodelegate', '.asm', '.ASM', '.ns2', '.objdump', '.m', '.j', '.ml', '.mli', '.mll', '.mly', '.ooc', '.pl', '.pm', '.php', '.php(345)', '.ps', '.eps', '.pot', '.po', '.pov', '.inc', '.prolog', '.pro', '.pl', '.properties', '.proto', '.py3tb', '.pytb', '.py', '.pyw', '.sc', 'SConstruct', 'SConscript', '.tac', '.rb', '.rbw', 'Rakefile', '.rake', '.gemspec', '.rbx', '.duby', '.Rout', '.r', '.r3', '.cw', '.rhtml', '.rst', '.rest', '.sass', '.scala', '.scaml', '.scm', '.scss', '.st', '.tpl', 'sources.list', '.S', '.R', '.sql', '.sqlite3-console', 'squid.conf', '.ssp', '.tcl', '.tcsh', '.csh', '.tex', '.aux', '.toc', '.txt', '.v', '.sv', '.vala', '.vapi', '.vb', '.bas', '.vm', '.fhtml', '.vim', '.vimrc', '.xml', '.xsl', '.rss', '.xslt', '.xsd', '.wsdl', '.xqy', '.xquery', '.xsl', '.xslt', '.yaml', '.yml'];

module.exports = class CopyContent {
    getName() { return "Display Content"; }
    load() { }
    start() {
        MessageContextMenuPatch();
        MessageContentPatch();
    }
    stop() {
        unpatchAll();
    }
    getSettingsPanel() { }
    onSwitch() {
        let chTemp = channel.getChannelId();
        if (chTemp != currentChannel) {
            currentChannel = chTemp
            active = {}
        }
    }
}

const fetchContent = url => new Promise(resolve => {
    const data = []
    https.get(url, res => {
      data.push(res.headers["content-type"])
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
          data.push(chunks.join(""))
          resolve(data)
        });
    });
});

function parseType(rawType, url) {

    let activeLang = langs.find(e => url.endsWith(e))

    if (activeLang) {
        if (activeLang.startsWith(".")) {
            activeLang = activeLang.slice(1)
        }
        type = activeLang
    } else {
        type = rawType.match(/^(.+?);./)[1]
        type = type.match(/\/([\s\S]*)$/)[1]
    }
    return type
}

function copyWrapper(message) {
    return function copy() {

        let contents = message.content
    
        const urls = contents.match(urlRegex)

        if (urls == null) {
            BdApi.showToast("Message does not contain a valid link");
        } else {
            urls.forEach(url => {
                try {
                    fetchContent(url)
                        .then(function(data) {
                            let type = parseType(data[0], url)
                            let body = [data[1], type]
                            active[message.id] = body
                            Dispatcher.dirtyDispatch({type: "MESSAGE_UPDATE", message: message})
                        })
                        .catch(error => {
                            BdApi.showToast("Error getting page", {type: "error"});
                            return Promise.reject(error)
                        });
                }
                catch (err) {
                    console.error(err)
                    BdApi.showToast(err, {type: "error"});
                } 
            });
        }
    }
}

function parseMd(body) {
    return Markdown.parse(`
    \`\`\`${body[1]}
      ${body[0]}
    \`\`\`
  `);
}

const MessageContextMenuPatch = () => BdApi.Patcher.after("MessageContextMenuPatch", MessageContextMenu, "default", (that, args, value) => {
    const [props] = args;
    let message = props.message
    value.props.children.push(BdApi.React.createElement(MenuItem.MenuItem, {
        label: "Display Link Contents",
        id: "Copy-Content",
        action: copyWrapper(message)
    }))
    return value;
});

const MessageContentPatch = () => BdApi.Patcher.after("MessageContentPatch", MessageContent, "type", (that, args, value) => {
    const [props] = args;
    if (active[props.message.id] != null) {
        let body = active[props.message.id]
        value.props.children.push(parseMd(body))
    }
    return value;
});

function unpatchAll() {
    BdApi.Patcher.unpatchAll("MessageContextMenuPatch");
    BdApi.Patcher.unpatchAll("MessageContentPatch")
}
