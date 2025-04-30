Vue.component('server-config', {
  props: {
    network: String,
    port: Number,
    serverkeys: Object,
    server: String,
    oldconfig: Array,
    clients: Object,
    usePresharedKey: Boolean
  },
  template: `
    <pre><code><span @click="$emit('select', $event)">[Interface]
Address = {{ network }}.1/24
ListenPort = {{ port }}
PrivateKey = {{ serverkeys.privateKey }}
# PublicKey = {{ serverkeys.publicKey }}
# Server = {{ server }}<span v-for="line in oldconfig">{{ line }}</span><span v-for="(value, client, index) in clients">

[Peer]
## {{ value.name }}
AllowedIPs = {{ network }}.{{ client }}/32
PublicKey = {{ value.publicKey }}<template v-if="usePresharedKey">
PresharedKey = {{ value.presharedKey }}</template>
# PrivateKey = {{ value.privateKey }}</span></span></code></pre>
  `
});

Vue.component('client-config', {
  props: {
    client: Object,
    clientId: [String, Number],
    network: String,
    serverkeys: Object,
    server: String,
    port: Number,
    allowednets: String,
    usePresharedKey: Boolean
  },
  template: `
    <pre><code :id="'code'+clientId"><span @click="$emit('select', $event)">[Interface]
## {{ client.name }}
Address = {{ network }}.{{ clientId }}/32
PrivateKey = {{ client.privateKey }}

[Peer]
PublicKey = {{ serverkeys.publicKey }}<template v-if="usePresharedKey">
PresharedKey = {{ client.presharedKey }}</template>
AllowedIPs = {{ network }}.0/24{{ allowednets ? ',' + allowednets : '' }}
Endpoint = {{ server }}:{{ port }}
PersistentKeepalive = 25</span></code></pre>
  `
}); 