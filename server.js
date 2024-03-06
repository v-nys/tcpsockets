import net from 'node:net';

const clients = [];
// geen koppeling namen aan sockets, zou kunnen maar is complexer
let names = [];
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const newlineByte = 0x10;

const server = net.createServer((c) => {
  // 'connection' listener.
  console.log('client aangemeld');
  c.on('end', () => {
    console.log('client afgemeld');
  });
  c.on('data', (data) => {
    // buffer want geen encoding ingesteld voor socket
    // hier wordt verondersteld dat elke waarde `data` een apart bericht is
    // server zou totaal overbelast moeten zijn voor er een probleem zou optreden
    const messageType = data[0];
    const payload = data.subarray(1);
    if (messageType == 0) {
        const name = textDecoder.decode(payload);
        if (names.includes(name) || payload.length > 255) {
            console.log("naam geweigerd");
            c.write(Buffer.from([1,newlineByte]));
        }
        else {
            console.log(`naam geregistreerd: ${name}`);
            names.push(name);
            let sent = new Uint8Array(payload.length + 2);
            // TODO: kan ik hier destructuren?
            sent.set([0]);
            sent.set(payload, 1);
            sent.set([newlineByte],payload.length+1);
            c.write(sent);
        }
    }
    else if (messageType == 1) {
        const name = textDecoder.decode(payload);
        names = names.filter(e => e != name);
        c.write(Buffer.from([2,newlineByte]));
        console.log("Naam (mogelijk) verwijderd.");
        console.log(`Resterende namen: ${names}`);
    }
    else if (messageType == 2) {
        let sent = new Uint8Array(data.length + 1);
        sent.set([3]);
        sent.set(data.subarray(1),1);
        sent.set([newlineByte],data.length);
        // M.O.: max TCP segment lengte is 536 (voor IPv4) of 1220 (IPv6)
        // wat houdt dat dan in voor applicatie...?
        // transparant?
        for (let client of clients) {
            client.write(sent);
        }
    }
  });
  clients.push(c);
});

server.on('error', (err) => {
  throw err;
});

server.listen(10000, () => {
  console.log('server is aan het luisteren');
});

export {}
