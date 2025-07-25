const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalFollow, GoalNear } = goals;
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Konfiguracja GUI
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Publiczny panel: http://top0srddd.com:${PORT}`);
});

// Obsługa statycznych plików
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// GUI Status
const botStatus = {
  position: 'N/A',
  health: 20,
  food: 20,
  target: 'Brak',
  mode: 'Czekam...',
  lastAction: 'Brak'
};

// Aktualizacja GUI
function updateGUI() {
  if (bot.entity) {
    const pos = bot.entity.position;
    botStatus.position = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
    botStatus.health = bot.health;
    botStatus.food = bot.food;
  }
  io.emit('bot-update', botStatus);
}

// --------------------- BOT ---------------------
const bot = mineflayer.createBot({
  host: 'craftmc.pl',
  port: 25565,
  username: 'wez2wdechy',
  version: '1.20.1'
});

bot.loadPlugin(pathfinder);

bot.once('spawn', () => {
  console.log("✅ Bot dołączył do gry.");
  setInterval(updateGUI, 2000);
  
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);
});

bot.on('message', (message) => {
  const raw = message.toString();
  console.log(`💬 [CZAT] ${raw}`);
  io.emit('chat-message', raw);

  if (raw.includes('/login')) {
    setTimeout(() => {
      bot.chat('/login eloeloelo');
      console.log("✅ Wysłano komendę logowania.");
      botStatus.lastAction = 'Logowanie';
    }, 2000);
  }

  if (raw.includes("Hasło zaakceptowane! Miłej gry")) {
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
      console.log("🧭 Kliknięto kompas!");
      botStatus.lastAction = 'Kliknięto kompas';
    }, 3000);
  }

  // Obsługa prywatnych komend
  if (raw.includes("-> ja")) {
    const cmdMatch = raw.match(/\$([a-z]+)(.*)/);
    if (!cmdMatch) return;

    const cmd = cmdMatch[1].trim().toLowerCase();
    const args = cmdMatch[2].trim();
    const senderMatch = raw.match(/\[(.*?) -> ja]/);
    const sender = senderMatch ? senderMatch[1].split(' ').pop() : "admin";

    // SPRAWDZENIE UPRAWNIEŃ
    if (!['top0srdd', 'admin'].includes(sender)) {
      bot.chat(`/msg ${sender} ❗ Brak uprawnień!`);
      return;
    }

    handleCommand(cmd, args, sender);
  }
});

// Obsługa komend
function handleCommand(cmd, args, sender) {
  switch (cmd) {
    case 'follow':
      followPlayer(args, sender);
      botStatus.mode = `Śledzenie: ${args}`;
      break;
    case 'stop':
      bot.pathfinder.setGoal(null);
      bot.chat(`/msg ${sender} ⛔ Przestaję śledzić.`);
      botStatus.mode = 'Czekam...';
      botStatus.target = 'Brak';
      break;
    case 'come':
      comeToPlayer(sender);
      botStatus.mode = `Idę do: ${sender}`;
      break;
    case 'coords':
      const pos = bot.entity.position;
      bot.chat(`/msg ${sender} 📍 Pozycja: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
      break;
    case 'say':
      if (args.length > 0) {
        bot.chat(args);
        bot.chat(`/msg ${sender} 📣 Powiedziałem: "${args}"`);
        botStatus.lastAction = `Mówię: ${args.substring(0, 15)}...`;
      }
      break;
    case 'jump':
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
      bot.chat(`/msg ${sender} 🦘 Skoczyłem!`);
      botStatus.lastAction = 'Skok!';
      break;
    case 'status':
      const pos2 = bot.entity.position;
      bot.chat(`/msg ${sender} 🤖 Jestem przy X:${pos2.x.toFixed(1)} Y:${pos2.y.toFixed(1)} Z:${pos2.z.toFixed(1)}.`);
      break;
    case 'dance':
      danceSequence(sender);
      botStatus.lastAction = 'Taniec!';
      break;
    case 'help':
      showHelpMenu(sender);
      break;
    default:
      bot.chat(`/msg ${sender} ❓ Nieznana komenda: $${cmd}`);
  }
}

// Sekwencja tańca
function danceSequence(sender) {
  bot.chat(`/msg ${sender} 💃 Rozpoczynam taniec!`);
  
  const moves = [
    { control: 'jump', duration: 300 },
    { control: 'sprint', duration: 500 },
    { control: 'jump', duration: 300 },
    { control: 'back', duration: 400 },
    { control: 'forward', duration: 400 }
  ];

  let delay = 0;
  moves.forEach(move => {
    setTimeout(() => {
      bot.setControlState(move.control, true);
      setTimeout(() => bot.setControlState(move.control, false), move.duration);
    }, delay);
    delay += move.duration + 200;
  });
}

// Menu pomocy
function showHelpMenu(sender) {
  const helpMessage = [
    "📚 Dostępne komendy:",
    "➡️ $follow <nick> - Śledź gracza",
    "➡️ $stop - Przestań śledzić",
    "➡️ $come - Przyjdź do mnie",
    "➡️ $coords - Moje współrzędne",
    "➡️ $say <tekst> - Powiedz coś",
    "➡️ $jump - Podskocz",
    "➡️ $dance - Zatańcz!",
    "➡️ $status - Mój status",
    "➡️ $help - To menu"
  ].join('\n');

  bot.chat(`/msg ${sender} ${helpMessage}`);
}

// Kliknięcie jabłka (slot 31) w menu trybów
bot.on('windowOpen', (window) => {
  console.log("📂 Otworzono menu wyboru!");
  botStatus.lastAction = 'Otwieranie menu';

  setTimeout(() => {
    const item = window.slots[31];
    if (item) {
      console.log(`🍏 Klikam jabłko (${item.name}) w slocie 31`);
      bot.clickWindow(31, 0, 0);
      botStatus.lastAction = 'Wybrano tryb: SkyBlock';
    } else {
      console.log("⚠️ Nie znaleziono jabłka w slocie 31");
    }
  }, 1500);
});

// Funkcja: śledzenie gracza
function followPlayer(name, sender) {
  waitForPlayer(bot, name).then(entity => {
    const goal = new GoalFollow(entity, 1);
    bot.pathfinder.setGoal(goal, true);
    bot.chat(`/msg ${sender} 👣 Śledzę gracza ${name}`);
    botStatus.target = name;
  }).catch(err => {
    bot.chat(`/msg ${sender} ❌ Nie widzę gracza: ${name}`);
  });
}

// Funkcja: podejście do gracza
function comeToPlayer(name) {
  waitForPlayer(bot, name).then(entity => {
    const pos = entity.position;
    const goal = new GoalNear(pos.x, pos.y, pos.z, 1);
    bot.pathfinder.setGoal(goal);
    bot.chat(`/msg ${name} 🚶‍♂️ Idę do Ciebie!`);
    botStatus.target = name;
  }).catch(() => {
    bot.chat(`/msg ${name} ❌ Nie mogę Cię znaleźć.`);
  });
}

// Pomocnicza funkcja: czekaj na pojawienie się gracza
function waitForPlayer(bot, name, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const player = bot.players[name];
      if (player && player.entity) return resolve(player.entity);
      if (Date.now() - start > timeout) return reject();
      setTimeout(check, 500);
    };
    check();
  });
}

// Połączenie WebSocket
io.on('connection', (socket) => {
  console.log('🌐 Połączono z GUI');
  updateGUI();
  
  socket.on('send-command', (command) => {
    bot.chat(command);
    botStatus.lastAction = `GUI: ${command.substring(0, 20)}...`;
  });
});

// Obsługa błędów
bot.on('error', err => console.error('❌ Błąd bota:', err));
bot.on('end', () => console.log('🔌 Rozłączono z serwerem'));
process.on('uncaughtException', err => console.error('🔥 Krytyczny błąd:', err));
