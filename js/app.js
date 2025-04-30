new Vue({
  el: "#app",
  data() {
    const savedData = localStorage.getItem('vpnConfigData');
    const defaultServerData = {
      server: "",
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
      serverkeys: wireguard.generateKeypair(),
      usePresharedKey: true
    };

    const defaultPeerData = {
      peerNetwork: "10.0.0",
      peerStartip: 1,
      peerUsePresharedKey: true,
      peerAllowednets: "",
      peerEndpoints: [
        {
          name: "Client 1",
          address: "",
          port: 51820
        },
        {
          name: "Client 2",
          address: "",
          port: 51820
        }
      ],
      peerClients: {},
      peerDlbuttonshidden: true
    };

    if (savedData) {
      const parsedData = JSON.parse(savedData);
      const mode = parsedData.mode || 'server';
      return {
        mode,
        ...defaultServerData,
        ...defaultPeerData,
        ...(mode === 'server' ? parsedData.serverData || {} : {}),
        ...(mode === 'peer' ? parsedData.peerData || {}  : {}),
        modalactive: null
      };
    }
    return {
      mode: 'server',
      ...defaultServerData,
      ...defaultPeerData
    };
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
    switchMode(newMode) {
      if (this.mode === newMode) return;
      this.mode = newMode;
      
      // 如果切换到对等模式且没有节点，添加默认节点
      if (newMode === 'peer' && this.peerEndpoints.length === 0) {
        this.peerEndpoints = [
          {
            name: "Client 1",
            address: "",
            port: 51820
          },
          {
            name: "Client 2",
            address: "",
            port: 51820
          }
        ];
      }
      
      this.saveData();
    },
    addPeer() {
      this.peerEndpoints.push({
        name: `Client ${this.peerEndpoints.length + 1}`,
        address: '',
        port: 51820
      });
    },
    removePeer(index) {
      this.peerEndpoints.splice(index, 1);
    },
    updatePeerClients() {
      if (this.peerEndpoints.length < 2) {
        alert('至少需要两个节点才能建立对等网络');
        return;
      }
      
      // 验证所有节点的配置
      const hasInvalidNode = this.peerEndpoints.some(peer => {
        return !peer.name || !peer.address || !peer.port;
      });

      if (hasInvalidNode) {
        alert('生成失败，请检查配置');
        return;
      }
      
      const newClients = {};
      this.peerEndpoints.forEach((peer, index) => {
        const finaloctet = Math.floor(index) + Math.floor(this.peerStartip);
        const keypair = wireguard.generateKeypair();
        newClients[finaloctet] = {
          ...keypair,
          name: peer.name,
          address: peer.address,
          port: peer.port
        };
        if (this.peerUsePresharedKey) {
          newClients[finaloctet].presharedKey = wireguard.generatePresharedKey();
        }
      });
      
      this.peerClients = newClients;
      this.peerDlbuttonshidden = false;
      this.generatePeerQRCodes();
    },
    generatePeerQRCodes() {
      const clients = this.peerClients;
      setTimeout(() => {
        for (let client in clients) {
          QRCode.toCanvas(
            document.getElementById('peerCanvas' + client),
            document.getElementById('peerCode' + client).innerText,
            {
              width: 180,
              height: 180,
              margin: 2
            }
          );
        }
      });
    },
    downloadPeerClients() {
      for (const config of this.peerConfigs) {
        const blob = new Blob([document.getElementById('peerCode' + config.id).innerText], {
          type: "text/plain;charset=utf-8",
        });
        saveAs(blob, config.name + ".conf");
      }
    },
    clearCache() {
      localStorage.removeItem('vpnConfigData');
      if (this.mode === 'server') {
        this.server = "";
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
        this.usePresharedKey = true;
      } else {
        this.peerNetwork = "10.0.0";
        this.peerStartip = 1;
        this.peerUsePresharedKey = true;
        this.peerAllowednets = "";
        this.peerEndpoints = [
          {
            name: "Client 1",
            address: "",
            port: 51820
          },
          {
            name: "Client 2",
            address: "",
            port: 51820
          }
        ],
        this.peerClients = {};
        this.peerDlbuttonshidden = true;
      }
    },
    saveData() {
      const dataToSave = {
        mode: this.mode,
        serverData: this.mode === 'server' ? {
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
          usePresharedKey: this.usePresharedKey
        } : undefined,
        peerData: this.mode === 'peer' ? {
          peerNetwork: this.peerNetwork,
          peerStartip: this.peerStartip,
          peerUsePresharedKey: this.peerUsePresharedKey,
          peerAllowednets: this.peerAllowednets,
          peerEndpoints: this.peerEndpoints,
          peerClients: this.peerClients,
          peerDlbuttonshidden: this.peerDlbuttonshidden
        } : undefined
      };
      localStorage.setItem('vpnConfigData', JSON.stringify(dataToSave));
    },
    select(event) {
      if (!event || !event.target) return;
      const range = document.createRange();
      range.selectNodeContents(event.target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
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
      // 验证基本配置
      if (!this.server || !this.port || !this.network || !this.startip || !this.clientcount) {
        alert('生成失败，请检查配置');
        return;
      }

      // 验证数值范围
      if (this.port < 1 || this.port > 65535 || 
          this.startip < 2 || this.startip > 254 || 
          this.clientcount < 1 || this.clientcount > 254 || 
          (this.startip + this.clientcount - 1) > 254) {
        alert('生成失败，请检查配置');
        return;
      }

      const newClients = {};
      for (let client in [...Array(Math.floor(this.clientcount)).keys()]) {
        const finaloctet = Math.floor(client) + Math.floor(this.startip);
        const keypair = wireguard.generateKeypair();
        newClients[finaloctet] = {
          ...keypair,
          name: "Client " + finaloctet
        };
        if (this.usePresharedKey) {
          newClients[finaloctet].presharedKey = wireguard.generatePresharedKey();
        }
      }
      this.clients = newClients;
      this.dlbuttonshidden = false;
      this.generateQRCodes();
    },
    downloadclients(event) {
      for (i = this.startip; i < this.startip + this.clientcount; i++) {
        const presharedKeyLine = this.usePresharedKey ? `PresharedKey = ${this.clients[i].presharedKey}\n` : '';
        let config = `[Interface]
## ${this.clients[i].name}
Address = ${this.network}.${i}/32
PrivateKey = ${this.clients[i].privateKey}

[Peer]
PublicKey = ${this.serverkeys.publicKey}
${presharedKeyLine}AllowedIPs = ${this.network}.0/24${this.allowednets ? ',' + this.allowednets : ''}
Endpoint = ${this.server}:${this.port}
PersistentKeepalive = 25`;

        var blob = new Blob([config], {
          type: "text/plain;charset=utf-8",
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
    copyConfig(clientId) {
      const code = document.getElementById('code' + clientId);
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
    },
    deleteConfig(clientId) {
      Vue.delete(this.clients, clientId);
    },
    generatePresharedKey() {
      return wireguard.generatePresharedKey();
    }
  },
  computed: {
    serverConfig() {
      return {
        network: this.network,
        port: this.port,
        serverkeys: this.serverkeys,
        server: this.server,
        oldconfig: this.oldconfig,
        clients: this.clients,
        usePresharedKey: this.usePresharedKey
      };
    },
    clientConfigs() {
      return Object.entries(this.clients).map(([id, client]) => ({
        client,
        clientId: id,
        network: this.network,
        serverkeys: this.serverkeys,
        server: this.server,
        port: this.port,
        allowednets: this.allowednets,
        usePresharedKey: this.usePresharedKey
      }));
    },
    peerConfigs() { 
      const configs = [];
      const clients = this.peerClients;
      const presharedKeys = {};  // 用来存储每对节点的PresharedKey
      
      for (let currentId in clients) {
        const currentClient = clients[currentId];
        const peers = [];
        
        // 添加其他节点作为peers
        for (let peerId in clients) {
          if (peerId !== currentId) {
            let presharedKey;
            
            // 检查是否已经为这对节点生成了PresharedKey
            if (!presharedKeys[`${currentId}-${peerId}`] && !presharedKeys[`${peerId}-${currentId}`]) {
              // 如果没有为该对节点生成PresharedKey，则生成一个
              presharedKey = this.generatePresharedKey();
              
              // 存储PresharedKey，确保两个节点之间一致
              presharedKeys[`${currentId}-${peerId}`] = presharedKey;
              presharedKeys[`${peerId}-${currentId}`] = presharedKey;
            } else {
              // 如果已经生成过PresharedKey，则直接使用
              presharedKey = presharedKeys[`${currentId}-${peerId}`] || presharedKeys[`${peerId}-${currentId}`];
            }
            
            const peer = clients[peerId];
            peers.push({
              name: peer.name,
              publicKey: peer.publicKey,
              presharedKey: this.peerUsePresharedKey ? presharedKey : null,
              endpoint: peer.address ? `${peer.address}:${peer.port}` : null,
              allowedIPs: `${this.peerNetwork}.${peerId}/32`
            });
          }
        }
        
        configs.push({
          id: currentId,
          name: currentClient.name,
          privateKey: currentClient.privateKey,
          address: `${this.peerNetwork}.${currentId}/32`,
          port: currentClient.port,
          peers
        });
      }
      
      return configs;
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
    },
    usePresharedKey(newVal) {
      if (newVal && Object.keys(this.clients).length > 0) {
        // 检查是否已经有预共享密钥
        const hasNoPreSharedKey = Object.values(this.clients).some(client => !client.presharedKey);
        if (hasNoPreSharedKey) {
          this.updateclients();
        }
      }
      this.saveData();
    },
    mode(val) { this.saveData(); },
    peerNetwork(val) { this.saveData(); },
    peerStartip(val) { this.saveData(); },
    peerUsePresharedKey(newVal) {
      if (newVal && Object.keys(this.peerClients).length > 0) {
        // 检查是否已经有预共享密钥
        const hasNoPreSharedKey = Object.values(this.peerClients).some(client => !client.presharedKey);
        if (hasNoPreSharedKey) {
          this.updatePeerClients();
        }
      }
      this.saveData();
    },
    peerAllowednets(val) { this.saveData(); },
    peerEndpoints: {
      handler(val) { this.saveData(); },
      deep: true
    },
    peerClients: {
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