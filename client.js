import net from 'node:net';
import { question, keyInSelect } from 'readline-sync';

// name is hier gedefinieerd want kan aangepast worden bij ontvangst data
let name = null;

// TextEncoder: van Unicode code points (standaard UTF-8 geëncodeerd) naar bytes
// TextDecoder: van bytes naar Unicode code points (standaard UTF-8 geëncodeerd)
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const newlineByte = 0x10;

// async, want anders krijgen callbacks niet de kans uit te voeren
// m.a.w. berichten van server kunnen enkel verwerkt worden wanneer hier 'await' geraakt wordt
async function clientMenu() {
  console.log("Verbonden.");
  const choices = ['Naam registreren', 'Naam afstaan', 'Bericht sturen', 'Deblokkeren'];
  console.log("Je hebt nog geen naam. Registreer er eerst een.");
  let choice = keyInSelect(choices)
  while (choice >= 0) {

      if (choice == 0) {
          if (!name) {
              let requestedNameBytes = textEncoder.encode(question("Welke naam wil je registreren?"));
              let sent = new Uint8Array(requestedNameBytes.length + 1);
              sent.set([choice]);
              sent.set(requestedNameBytes, 1);
              client.write(sent);
          }
          else {
              console.log("Je hebt al een naam.");
          }
      }
      else if (choice == 1) {
          let currentNameBytes = textEncoder.encode(name);
          let sent = new Uint8Array(currentNameBytes.length + 1);
          sent.set([choice]);
          sent.set(currentNameBytes, 1);
          client.write(sent);
          // was misschien beter hier naam al op te geven, zonder bevestiging
      }
      else if (choice == 2 && name) {
          let messageBytes = textEncoder.encode(question("Wat is het bericht?"));
          const nameBytes = textEncoder.encode(name);
          // om deze reden is naam zender max 255 bytes
          // lengte wordt uitgedrukt in veld van 1 byte
          let sent = new Uint8Array(1 + 1 + nameBytes.length + messageBytes.length);
          sent.set([choice]);
          sent.set([nameBytes.length], 1);
          sent.set(nameBytes, 2);
          sent.set(messageBytes, nameBytes.length + 2);
          const flushedEntireBuffer = client.write(sent);
          if (!flushedEntireBuffer) {
              console.log("Data kon niet in één keer weggeschreven worden.");
          }
      }
      else if (choice == 2) {
          console.log("Je moet eerst (bevestiging voor) een naam krijgen.");
      }
      else {
          // hoef niets te doen bij keuze om te deblokkeren
      }
      // zonder await zouden callbacks nooit kans krijgen uit te voeren
      await new Promise((resolve) => setTimeout(resolve,100));
      if (!name) {
          console.log("Je hebt nog geen naam. Registreer er eerst een of deblokkeer als je er al een hebt gevraagd.");
      }
      else {
          console.log(`Je naam is ${name}. Wat wil je doen?`);
      }
      choice = keyInSelect(choices);
  }
  process.exit(0);
}

const client = net.createConnection({ host: "192.168.0.222", port: 10000 }, clientMenu);

client.on('data', (data) => {
  // data is een buffer die meerdere messages kan bevatten
  let start = 0;
  let end = 0;
  const messages = []
  while (end < data.length) {
    if (data[end] === newlineByte) {
      messages.push(data.subarray(start, end));
      start = end + 1;
    }
    end++;
  }
  for (let message of messages) {
    const messageType = message[0];
    if (messageType == 0) { // bevestiging naam
        name = textDecoder.decode(message.subarray(1));
        console.log(`Je naam is nu: ${name}`);
    }
    else if (messageType == 1) { // weigering naam
        console.log("Naam is geweigerd. Hij kan bezet zijn of kan te lang zijn.");
    }
    else if (messageType == 2) { // bevestiging schrappen naam
        name = null;
    }
    else if (messageType == 3) {
        const senderNameLengthInBytes = message[1];
        const senderName = textDecoder.decode(message.subarray(2, senderNameLengthInBytes + 2));
        const innerMessage = textDecoder.decode(message.subarray(senderNameLengthInBytes + 2));
        console.log(`${senderName} zegt: ${innerMessage}\n`);
    }
  }
});
client.on('end', () => {
  console.log('Verbinding met de server is beëindigd.');
}); 

export {}
