const { Socket } = require("socket.io");

const express = require("express");

const app = express();
const http = require("http").createServer(app);
const path = require("path");
const port = 8080;

/**
 * @type {Socket}
 */
const io = require("socket.io")(http);

app.use(
  "/bootstrap/css",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/css")),
);
app.use(
  "/bootstrap/js",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/js")),
);
app.use(
  "/jquery",
  express.static(path.join(__dirname, "node_modules/jquery/dist")),
);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/games/tic-tac-toe", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/games/tic-tac-toe.html"));
});
app.get("/games/skyjo", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/games/skyjo.html"));
});

http.listen(port, () => {
  console.log(`Listening on http://localhost:${port}/`);
});

let rooms = []; //tableau qui contient toutes les rooms du serveur

io.on("connection", (socket) => {
  console.log(`[connection] ${socket.id}`); //affiche dans la console l'id du client qui se connecte

  socket.on("playerData", (player) => {
    //evenement qui permet de recevoir les données du joueur
    console.log(
      `[playerData] le joueur \x1b[1m\x1b[34m${player.username}\x1b[0m a rejoint la room \x1b[1m\x1b[32m${player.roomId}\x1b[0m`); //affiche dans la console le nom du joueur

    let room = null; //initialisation de la variable room

    if (!player.roomId) {
      //si le player n'a pas de roomId CREER UNE ROOM
      room = createRoom(player); //créer la room du joeur (hôte)
      console.log(
        `[create room ] - La room ${room.id} a été créée par ${player.username}`,
      ); // écrit dans la console l'id de la room et le nom du joueur
    } else {
      // si le joueur veut rejoindre une room
      room = rooms.find((r) => r.id === player.roomId); //vérifie si l'id du salon correspond bien à l'id de room que le joueur a
      if (room === undefined) {
        return;
      } //cas où il ne trouve pas de room avec l'id du joueur
      // sinon
      player.roomId = room.id; // le joueur prend en id de room l'id de la room qu'il a trouvé
      room.players.push(player); //ajoute le joueur au tableau des joueurs de la room
    }

    socket.join(room.id); //dans les deux cas, le joueur rejoint la room q'il a trouvé ou créé
    console.log(
      `[Suivi des connections] - Il y a ${"\x1b[1m\x1b[32m" + room.players.length + "\x1b[0m"} / ${"\x1b[1m\x1b[32m" + room.numPlayers + "\x1b[0m"} joueurs dans la room \x1b[1m\x1b[32m${room.id}\x1b[0m avant que la partie commence`,
    );
    io.to(socket.id).emit("join room", room.id, room.players); //permet de savoir si un joueur est rentré dans le salon
    socket.broadcast.emit("actu_listejoueurs", room.players);





    
    if (room.players.length === parseInt(room.numPlayers)) {
      console.log(`Partie lancée avec un nombre de joueurs de : ${parseInt(room.numPlayers,)}`,
      );
      room.players.forEach((player) => {
        const cartesJoueur = jeuDeCartesSkyjo.splice(0, 12);
        const carte_depart = jeuDeCartesSkyjo.splice(0, 1);
        // Émettre les cartes du joueur avec les modifications
        console.log(carte_depart)
        let firstround = true
        socket.broadcast.emit("cartes joueur", [{ joueurId: player.socketId, cartes: cartesJoueur, nom: player.username}], carte_depart, firstround);
        io.to(socket.id).emit("cartes joueur", [{ joueurId: player.socketId, cartes: cartesJoueur, nom: player.username}], carte_depart, firstround);
      });
                                                      
      io.to(room.id).emit("start game", room.players); //si le nombre de joueurs est égal au nombre de joueurs de la room, alors on lance la partie
    }
  });

  socket.on("newround", (liste_joueurs) => {
      jeuDeCartesSkyjo = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-2,-2,-2,-2,-2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1 ,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,9,9,9,9,10,10,10,10,10,10,10,10,10,10,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12]
          melangerCartes (jeuDeCartesSkyjo);
        liste_joueurs.forEach(function(player) {
      const cartesJoueur = jeuDeCartesSkyjo.splice(0, 12);
      const carte_depart = jeuDeCartesSkyjo.splice(0, 1);
      // Émettre les cartes du joueur avec les modifications
      console.log(carte_depart)
      let firstround = false
      socket.broadcast.emit("cartes joueur", [{ joueurId: player.socketId, cartes: cartesJoueur, nom: player.username}], carte_depart, firstround);
      io.to(socket.id).emit("cartes joueur", [{ joueurId: player.socketId, cartes: cartesJoueur, nom: player.username}], carte_depart, firstround);
      })
  });
  
  socket.on("get rooms", () => {
    //écoute l'événement émis pa rle client pour récupérer les salons disponible sur le serveur
    io.to(socket.id).emit("list rooms", rooms); //envoie le tableau des rooms au client
  });

  socket.on("play again", (roomId) => {
    const room = rooms.find((r) => r.id === roomId);

    if (room && room.players.length === 2) {
      io.to(room.id).emit("play again", room.players);
    }
  });

  socket.on("disconnect", () => {
    //événement qui permet de supprimer le salon quand il n'y a plus l'hote dans le salon
    console.log(`[disconnect] ${socket.id}`);
    let room = null;

    rooms.forEach((r) => {
      r.players.forEach((p) => {
        // pour chque player de chaque salon
        if (p.socketId === socket.id && p.host) {
          //si c'est l'hôte
          room = r;
          rooms = rooms.filter((r) => r !== room); // filtre le tableau des salons qui n'ont pas d'hote
        }
      });
    });
  });

  socket.on("end turn", (roomId) => {
    const player = getPlayerBySocketId(socket.id); // Obtenir le joueur actuel par son socketId

    if (!player) {
      console.log("Player not found.");
      return;
    }

    const room = rooms.find((r) => r.id === roomId);

    if (room) {
      if (player.socketId !== room.players[room.currentPlayerIndex].socketId) {
        // Ce n'est pas le tour du joueur actuel
        io.to(player.socketId).emit("not your turn");
        console.log("Ce n'est pas votre tour.");
        return;
      }

      room.currentPlayerIndex =
        (room.currentPlayerIndex + 1) % room.players.length; // Passer au joueur suivant
      const nextPlayer = room.players[room.currentPlayerIndex];
      io.to(nextPlayer.socketId).emit("start turn"); // Notifier le joueur suivant pour commencer son tour
    } else {
      console.log(`Room with ID ${roomId} not found.`);
    }
  });

  socket.on("piochePioche", (defausse) => {
      const player = getPlayerBySocketId(socket.id);
      const room = rooms.find((r) => r.id === player.roomId);
      console.log("carte dans la pioche nombre",jeuDeCartesSkyjo.length);

      // Vérifie si c'est le tour du joueur actuel
      if (player.socketId !== room.players[room.currentPlayerIndex].socketId) {
          // Ce n'est pas le tour du joueur actuel
          io.to(player.socketId).emit("not your turn");
          console.log("Ce n'est pas votre tour.");
          return;
      }

      // Vérifie s'il reste des cartes dans la pioche
      if (jeuDeCartesSkyjo.length > 0) {
          const cartePiochee = jeuDeCartesSkyjo.pop(); // Retire la carte du dessus de la pioche
          truc = parseInt(cartePiochee)
          io.emit("carte-piochee", cartePiochee); // Envoie la carte piochée à tous les joueurs
      } else {
          console.log("La pioche est vide !");
          jeuDeCartesSkyjo = defausse.slice(); // Copie toutes les cartes de la defausse à jeuDeCartesSkyjo
          defausse = []; // Vide la defausse
  
          // Mélangez le jeu de cartes
          melangerCartes(jeuDeCartesSkyjo);

  
          console.log("Le jeu de cartes a été réinitialisé avec les cartes de la defausse.");
          socket.emit("reinitialisationdefausse");
        }
  });

  socket.on("piocheDefausse", (defausse) => {
      const player = getPlayerBySocketId(socket.id);
      const room = rooms.find((r) => r.id === player.roomId);
      console.log("carte dans la pioche nombre",jeuDeCartesSkyjo.length);

      // Vérifie si c'est le tour du joueur actuel
      if (player.socketId !== room.players[room.currentPlayerIndex].socketId) {
          // Ce n'est pas le tour du joueur actuel
          io.to(player.socketId).emit("not your turn");
          console.log("Ce n'est pas votre tour.");
          return;
      }

      // Vérifie s'il reste des cartes dans la pioche
      if (defausse.length > 0) {
          const cartePiochee = defausse.pop(); // Retire la carte du dessus de la pioche
          truc = parseInt(cartePiochee)
          io.emit("carte-piochee-defausse", cartePiochee); // Envoie la carte piochée à tous les joueurs
      } 
  });
  
  socket.on("swap_carte", (carteValue, cartepiocheValue, carteId) => {
      cartepiocheValue = truc
      console.log("cartevalue=",carteValue);
      console.log("cartePiocheValue=",cartepiocheValue);
      console.log("id de la carte selectionnee=",carteId);
      
      io.emit("order_swap_carte", carteValue,cartepiocheValue, carteId);
      console.log(jeuDeCartesSkyjo.length);
      truc = null
  });

  socket.on("defausse_dela_carte_piochee", (cartepiocheValue) => {
      const player = getPlayerBySocketId(socket.id);
      const room = rooms.find((r) => r.id === player.roomId);

      // Vérifie si c'est le tour du joueur actuel
      if (player.socketId !== room.players[room.currentPlayerIndex].socketId) {
          // Ce n'est pas le tour du joueur actuel
          io.to(player.socketId).emit("not your turn");
          console.log("Ce n'est pas votre tour.");
          return;
      }

      // Vérifie s'il reste des cartes dans la pioche
      if (jeuDeCartesSkyjo.length > 0) {
        io.emit("order_defausse_dela_carte_piochee", cartepiocheValue);
        cartepiocheValue = null

      } else {
          console.log("La pioche est vide !");
          // Vous pouvez ajouter du code pour gérer le cas où la pioche est vide
      }
  });

  socket.on("joueur_retourne_carte", (carteretournee_id) => {
  io.emit("order_joueur_retourne_carte", carteretournee_id);
  });

  socket.on("carte_modifiee", (data) => {
    // Transmettre les modifications à tous les autres joueurs
    io.emit("carte_modifiee", data);
  });

  socket.on("align col1", (div0, div4, div8) => {
    io.emit("order align col1", div0, div4, div8);
  });
  socket.on("align col2", (div1, div5, div9) => {
    io.emit("order align col2", div1, div5, div9);
  });
  socket.on("align col3", (div2, div6, div10) => {
    io.emit("order align col3", div2, div6, div10);
  });
  socket.on("align col4", (div3, div7, div11) => {
    io.emit("order align col4", div3, div7, div11);
  });

  socket.on("end_round", (playerId) => {
    io.emit("order_end_round", playerId); 
    console.log(playerId, "ce joueur a mis fin au tour")
  });
  socket.on("info2", (playerfacevisible) => {
    socket.broadcast.emit("order_info2", playerfacevisible); 
    console.log(playerfacevisible, "a retourné toutes ces cartes")
  });


  
let truc = null  
});

function getPlayerBySocketId(socketId) {
  // Parcourir toutes les salles pour trouver le joueur avec le socketId donné
  for (const room of rooms) {
    // Recherche du joueur dans la liste des joueurs de la salle actuelle
    const player = room.players.find((p) => p.socketId === socketId);
    // Si le joueur est trouvé, le retourner
    if (player) {
      return player;
    }
  }
  // Si le joueur n'est pas trouvé, retourner null
  return null;
}

function createRoom(player) {
  const room = {
    id: roomId(),
    players: [],
    numPlayers: player.numPlayers,
    currentPlayerIndex: 0,
  }; // Ajouter le nombre de joueurs à la salle

  player.roomId = room.id;
  room.players.push(player);
  rooms.push(room);

  console.log(
    `[create room] - ${room.id} - ${player.username} - ${room.numPlayers}`,
  );

  return room;
}

function roomId() {
  //génération d'un ID de room aléatoire
  return Math.random().toString(36).substr(2, 9);
}

let jeuDeCartesSkyjo = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-2,-2,-2,-2,-2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1 ,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,9,9,9,9,10,10,10,10,10,10,10,10,10,10,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12]




// let jeuDeCartesSkyjo = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-2,-2,-2,-2,-2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,]






function melangerCartes(jeuDeCartes) {
    for (let i = jeuDeCartes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // Générer un indice aléatoire
        [jeuDeCartes[i], jeuDeCartes[j]] = [jeuDeCartes[j], jeuDeCartes[i]]; // Échanger les éléments aux indices i et j
    }
}

melangerCartes(jeuDeCartesSkyjo);