new Vue({
  el: "#app",
  data() {
    // 从localStorage加载保存的数据
    const savedData = localStorage.getItem('vpnConfigData');
    const defaultData = {
      server: "vpn.example.com",
      port: 51820,
      network: "10.0.0",
      startip: 2,
      clientcount: 2,
      allowednets: "",
      interfacename: "wg0",
      oldconfig: [],
      clients: {},
      modalactive: null,
      dlbuttonshidden: true,
      serverkeys: wireguard.generateKeypair()
    };

    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // 确保modalactive属性存在
      return {
        ...parsedData,
        modalactive: null
      };
    }
    return defaultData;
  },
  mounted() {
    // 如果有已保存的客户端配置，重新生成二维码
    if (Object.keys(this.clients).length > 0) {
      this.generateQRCodes();
    }
  },
  methods: {
    generateQRCodes() {
      const clients = this.clients;
      setTimeout(() => {
        for (let client in clients) {
          QRCode.toCanvas(
            document.getElementById('canvas' + client),
            document.getElementById('code' + client).innerText,
            {
              width: 180,
              height: 180,
              margin: 2
            }
          );
        }
      });
    },
    // 添加清空缓存方法
    clearCache() {
      localStorage.removeItem('vpnConfigData');
      this.server = "vpn.example.com";
      this.port = 51820;
      this.network = "10.0.0";
      this.startip = 2;
      this.clientcount = 2;
      this.allowednets = "";
      this.interfacename = "wg0";
      this.oldconfig = [];
      this.clients = {};
      this.dlbuttonshidden = true;
      this.serverkeys = wireguard.generateKeypair();
    },
    select(event) {
      r = document.createRange(); r.selectNode(event.target.closest("span"));
      s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    importconfig(event) {
      var data = this;
      var config = document.getElementById("textimport").value.split( /\n/ ) // split lines
      config.map( line => line.trim() ) // cleanup whitespace
      var section = null;
      data.oldconfig = [];
      config.forEach(line => {
        if ( line.length ) {
          if ( line.startsWith("[") ) { 
            section = line;
            if (section == "[Peer]") {
              data.oldconfig.push("");
              data.oldconfig.push(section);
            } 
          } else { 
            var parts = line.split("=");
            var key = parts.shift().trim();
            var value = parts.join("=").trim();
            switch (section + key) {
              case '[Interface]Address': data.network = value.split(".").slice(0,3).join("."); break;
              case '[Interface]ListenPort': data.port = value; break;
              case '[Interface]PrivateKey': data.serverkeys.privateKey = value; break;
              case '[Interface]# PublicKey': data.serverkeys.publicKey = value; break;
              case '[Interface]# Server': data.server = value; break;
              default:
                data.oldconfig.push(line)
                if (section + key == "[Peer]AllowedIPs") {
                  var lastip = Math.floor(value.split(".").slice(-1)[0].split("/")[0])
                  if (lastip + 1 > data.startip) {
                    data.startip = lastip + 1;
                  }
                }
            } 
          }
        } 
      })
      data.modalactive = null;
    },
    updateclients(event) {
      this.clients = this.makeclients;
      this.dlbuttonshidden = false;
      this.generateQRCodes();
    },
    downloadclients(event) {
      for (i = this.startip; i < this.startip + this.clientcount; i++) {
        var allowedIPs = this.network + ".0/24";
        if (this.allowednets && this.allowednets.trim()) {
          allowedIPs += "," + this.allowednets;
        }
        var blob = new Blob(["[Interface]\n## "+this.clients[i].name+"\nAddress = "+this.network+"."+i+"/24\nPrivateKey = "+this.clients[i].privateKey+"\n\n[Peer]\nPublicKey =  "+this.serverkeys.publicKey+"\nAllowedIPs = "+allowedIPs+"\nEndpoint = "+this.server+":"+this.port+" \nPersistentKeepalive = 25"], {
            type: "text/plain;charset=utf-8;",
        });
        saveAs(blob, this.clients[i].name + ".conf");
      }
    },
    downloadqrcodes(event) {
      for (w = this.startip; w < this.startip + this.clientcount; w++) {
        var canvas = document.getElementById("canvas"+w);
        download(canvas, this.clients[w].name);
      }
    },
    copyConfig(client) {
      const codeElement = document.getElementById('code' + client);
      const range = document.createRange();
      range.selectNode(codeElement);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
    },
    deleteConfig(client) {
      this.$delete(this.clients, client);
    },
    saveData() {
      const dataToSave = {
        server: this.server,
        port: this.port,
        network: this.network,
        startip: this.startip,
        clientcount: this.clientcount,
        allowednets: this.allowednets,
        interfacename: this.interfacename,
        oldconfig: this.oldconfig,
        clients: this.clients,
        dlbuttonshidden: this.dlbuttonshidden,
        serverkeys: this.serverkeys,
        modalactive: this.modalactive
      };
      localStorage.setItem('vpnConfigData', JSON.stringify(dataToSave));
    }
  },
  computed: {
    makeclients() {
      var c = {};
      for (client in [...Array(Math.floor(this.clientcount)).keys()]) {
        finaloctet = Math.floor(client) + Math.floor(this.startip);
        c[finaloctet] = wireguard.generateKeypair();
        c[finaloctet].name = "Client " + finaloctet;
      }
      return c
    }
  },
  // 添加watch来监听数据变化并保存
  watch: {
    server(val) { this.saveData(); },
    port(val) { this.saveData(); },
    network(val) { this.saveData(); },
    startip(val) { this.saveData(); },
    clientcount(val) { this.saveData(); },
    allowednets(val) { this.saveData(); },
    interfacename(val) { this.saveData(); },
    oldconfig: {
      handler(val) { this.saveData(); },
      deep: true
    },
    clients: {
      handler(val) { this.saveData(); },
      deep: true
    },
    serverkeys: {
      handler(val) { this.saveData(); },
      deep: true
    }
  }
});

function download(canvas, name) {
  canvas.toBlob(function(blob) {
      saveAs(blob, name + ".png");
  })
} 