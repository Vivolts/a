const player = {
  //objet player
  host: false, //hôte ? oui(créateur du salon)/non
  roomId: null, // permet de savoir dans quel salon le joueur est
  username: "", //nom
  socketId: "", // id du socket
  turn: false, // pour savoir si c'est son tour
  win: false, //pour savoir si il a gagné
  isDefaussing: false,
  prisedansdefausse: false,
  finisher: false,
  points : 0, 
  total_points : 0
};

const socket = io();
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomId = urlParams.get("room");

if (roomId) {
  document.getElementById("start").innerText = "Rejoindre";
}

const usernameInput = document.getElementById("username");
const gameCard = document.getElementById("game-card");
const userCard = document.getElementById("user-card");
const restartArea = document.getElementById("restart-area"); //récupère l'id de la div qui contient le bouton pour recommencer
const waitingArea = document.getElementById("waiting-area");
const roomsCard = document.getElementById("rooms-card");
const roomsList = document.getElementById("rooms-list");
const turnMsg = document.getElementById("turn-message");
const linkToShare = document.getElementById("link-to-share");
const numPlayersInput = document.getElementById("numPlayers"); // Récupérer l'élément de formulaire pour le nombre de joueurs
const tableauscore = document.getElementById("tableauJoueurs");
const usernames = [];

let liste_joueurs = null
let ennemyUsername = "";
let a_piocher = false;
var valeur = null;
classeCouleur = null;
let display_carte_piochee = document.createElement("div");
let carte_pioche_defausse = document.createElement("div");
let carte_depart_aff = document.createElement("div");
let defausse = [];
var playerCartes = document.querySelectorAll(".maindesjoueurs .hand .carte");
let secu = false;

///////////////////////////////////////////////////////////////////////////
// GESTION DES SALONS ////////////////////////////////////////////////////

socket.emit("get rooms"); //récupère auprès du serveur la liste des salons
socket.on("list rooms", (rooms) => {
  //dès que le client recoit le tableau des salons
  let html = "";

  if (rooms.length > 0) {
    rooms.forEach((room) => {
      if (room.players.length < room.numPlayers) {
        //affiche dans le html tou salon qui n'est pas plein (car ici 2 joueur max pour l'instant)
        html += `<li class="list-group-item d-flex justify-content-between">
                            <p class="p-0 m-0 flex-grow-1 fw-bold">Salon de ${room.players[0].username} - ${room.id}</p>
                            <button class="btn btn-sm btn-success join-room" data-room="${room.id}">Rejoindre</button> 
                        </li>`; //quand on clique sur le bouton rejoindre, on envoie le roomId au client
      }
    });
  }

  if (html !== "") {
    //si l'html n'est pas vide, (et donc que le salon n'est pas plein, voir juste au dessus) on affiche la liste des salons
    roomsCard.classList.remove("d-none");
    roomsList.innerHTML = html; // permet de remplir le html avec la liste des salons

    for (const element of document.getElementsByClassName("join-room")) {
      element.addEventListener("click", joinRoom, false); //ecoute d'évenement sur le bouton rejoindre et active la fonction joinRoom
    }
  }
});

$("#form").on("submit", function (e) {
  e.preventDefault();

  // Récupérer le nombre de joueurs choisi par l'hôte
  const numPlayers = numPlayersInput.value;

  player.username = usernameInput.value;
  if (roomId) {
    player.roomId = roomId;
  } else {
    player.host = true;
    player.turn = true;
  }
  player.socketId = socket.id;

  // Ajouter le nombre de joueurs à l'objet player
  player.numPlayers = numPlayers;

  userCard.hidden = true;
  waitingArea.classList.remove("d-none");
  roomsCard.classList.add("d-none");

  socket.emit("playerData", player);
});

socket.on("join room", (roomId, roomplayers) => {
  player.roomId = roomId;
  linkToShare.innerHTML = `<a href="${window.location.href}?room=${player.roomId}" target="_blank">${window.location.href}?room=${player.roomId}</a>`;

  const playersListElement = document.getElementById("players-list");

  // Nettoyez d'abord la liste pour éviter les doublons
  playersListElement.innerHTML = "";

  // Parcourez les joueurs dans la salle d'attente et ajoutez-les à la liste
  roomplayers.forEach(function(player) {
    const playerListItem = document.createElement("li");
    playerListItem.classList.add("list-group-item");
    playerListItem.textContent = player.username;
    playersListElement.appendChild(playerListItem);
  });

});
socket.on("actu_listejoueurs", (roomplayers) => {
  const playersListElement = document.getElementById("players-list");
  playersListElement.innerHTML = "";
  roomplayers.forEach(function(player) {
    const playerListItem = document.createElement("li");
    playerListItem.classList.add("list-group-item");
    playerListItem.classList.add("name");
    playerListItem.textContent = player.username;
    playersListElement.appendChild(playerListItem);
  });

});


socket.on("start game", (players) => {
  liste_joueurs = players;
  console.log(liste_joueurs, "liste joeuur")
  startGame(players);

  



  
  var playerCartes = document.querySelectorAll(".player .hand .carte");
  playerCartes.forEach(function (carte) {
    var valeur = parseInt(carte.textContent);
    var classeCouleur = getColorClass(valeur);
    carte.classList.add(classeCouleur);
  });
});

socket.on("cartes joueur", (cartesJoueurs, carte_depart, firstround) => {
  
  console.log(carte_depart);
  carte_depart_aff.dataset.value = carte_depart;
  carte_depart_aff.classList.add("carte");
  defausse = []
  defausse.push(carte_depart);
  console.log(defausse, "defausse");
  actualiserDefausse(defausse);


  
  cartesJoueurs.forEach((data) => {
    const joueurId = data.joueurId;
    const cartesJoueur = data.cartes;
    const username = data.nom; // Ajout de l'username du joueur

    let divJoueur = document.getElementById("joueur" + joueurId);
    if (!divJoueur) {
      divJoueur = document.createElement("div");
      divJoueur.id = "joueur" + joueurId;
      const playerContainer = document.getElementById("player-container");

      divJoueur.className = "hand";

      playerContainer.appendChild(divJoueur);

      // Création d'un élément pour afficher l'username du joueur
      const usernameElement = document.createElement("div");
      usernameElement.className = "username";
      usernameElement.textContent = username;
      divJoueur.appendChild(usernameElement);
    } 

    if (!firstround) {
        divJoueur.querySelectorAll('div.carte').forEach(e => e.remove());
    }
    
    cartesJoueur.forEach((carte, index) => {
      const divCarte = document.createElement("div");
      const carteId = "carte_xxx_" + joueurId + "_xxx_" + index;
      divCarte.id = carteId;
      divCarte.className = "carte";
      divCarte.classList.add("face-cachee");
      divCarte.textContent = carte;
      divCarte.dataset.value = carte;
      divJoueur.appendChild(divCarte);
    });


    
    if (player.host) {
      const cartesIndices = [];
      while (cartesIndices.length < 2) {
        const randomIndex = Math.floor(Math.random() * cartesJoueur.length);
        if (!cartesIndices.includes(randomIndex)) {
          cartesIndices.push(randomIndex);
        }
      }

      
      // Suppression de la classe "face-cachee" des deux cartes sélectionnées
      cartesIndices.forEach((indice) => {
        const carteId = "carte_xxx_" + joueurId + "_xxx_" + indice;
        const carte = document.getElementById(carteId);
        if (carte) {
          carte.classList.remove("face-cachee");

          // Émettre vers le serveur les cartes modifiées
          socket.emit("carte_modifiee", {
            joueurId: joueurId,
            carteId: carteId,
          });
        }
      });
    }
  });
});


///////////////////////////////////////////////////////////////////////////
// GESTION DES TOURS ////////////////////////////////////////////////////

$("#findutour").on("click", function () {
  socket.emit("end turn", player.roomId); // Transmettez player.roomId avec l'événement "end turn"
  console.log("Le joueur avec l'ID:", player.roomId, "à mis fin à son tour.");
  setTurnMessage(
    "alert-success",
    "alert-info",
    "Ce n'est plus à ton tour de jouer",
  );
  checkalign();
  check_allfacevisible ();
});

socket.on("not your turn", () => {
  setTurnMessage(
    "alert-info",
    "alert-danger",
    "Ce n'est pas encore à ton tour de jouer sale forceur !",
  );
});

socket.on("start turn", () => {
  setTurnMessage("alert-info", "alert-success", "C'est à ton tour de jouer !");
  player.turn = true;
  a_piocher = false;
  player.isDefaussing = false;
  player.prisedansdefausse = false;
  console.log(player.finisher)
  if (player.finisher === true){
    socket.emit("end_round", player.socketId)
  }
});

///////////////////////////////////////////////////////////////////////////
// GESTION DES ECOUTES D'EVENEMENTS  ////////////////////////////////////////////////////

document.getElementById("piochePioche").addEventListener("click", () => {
  if (player.turn === true && a_piocher === false) {
    socket.emit("piochePioche", defausse);
    a_piocher = true;
  } else {
    console.log("Tu dois mettre fin à ton tour !");
  }
  //check()
});

document.getElementById("defausse").addEventListener("click", () => {
  if (player.turn === true && a_piocher === false) {
    socket.emit("piocheDefausse", defausse);
    console.log("piochedefausse")
    a_piocher = true;
    player.prisedansdefausse = true
  } 
  else if (player.turn === true && a_piocher === true) {
    player.isDefaussing = true; 
    if (player.isDefaussing === true && secu === false) {
      defausserLaCarte(display_carte_piochee);
      secu = true;
    }
  }
});

document
  .querySelector(".maindesjoueurs")
  .addEventListener("click", function (event) {
    const carteCliquee = event.target.closest(".carte");
    if (carteCliquee) {
      if (player.isDefaussing === false && player.prisedansdefausse === false) {
        remplacerDansLeJeu(carteCliquee, display_carte_piochee);
      } 
      else if (player.isDefaussing === false && player.prisedansdefausse === true){
       remplacerDansLeJeu(carteCliquee, carte_pioche_defausse);
        console.log("suivi 3")
      }
      else {
        console.log("Impossible de remplacer la carte ");
      }
    }
  });

///////////////////////////////////////////////////////////////////////////
// INTERACTION DU JEU AVEC LE SERVEUR  ////////////////////////////////////////////////////

socket.on("carte-piochee", (carte) => {
  display_carte_piochee.classList.remove(classeCouleur);
  valeur = null;
  classeCouleur = null;
  display_carte_piochee.classList.add("carte");
  display_carte_piochee.dataset.value = parseInt(carte);
  valeur = parseInt(carte);
  classeCouleur = getColorClass(valeur);
  //console.log("b",classeCouleur)
  display_carte_piochee.classList.add(classeCouleur);
  display_carte_piochee.classList.remove("carte-default");
  const piocheParent = document.getElementById("pioche");
  piocheParent.appendChild(display_carte_piochee);

  console.log("La carte piochée par le joueur est :", display_carte_piochee);
});

socket.on("carte-piochee-defausse", (carte) => {

  carte_pioche_defausse.classList.remove(classeCouleur);
  valeur = null;
  classeCouleur = null;
  carte_pioche_defausse.classList.add("carte");
  carte_pioche_defausse.dataset.value = parseInt(carte);
  valeur = parseInt(carte);
  classeCouleur = getColorClass(valeur);

  carte_pioche_defausse.classList.add(classeCouleur);
  carte_pioche_defausse.classList.remove("carte-default");

  console.log("La carte piochée dans la défausse par le joueur est :", carte_pioche_defausse);

  console.log("suivi 2")
});

socket.on("order_swap_carte", (carteValue, cartepiocheValue, carteId) => {
  // Trouver la carte à remplacer par son ID
  const carteARemplacer = document.getElementById(carteId);

  if (carteARemplacer && player.isDefaussing === false) {
    carteARemplacer.className = "";
    carteARemplacer.classList.add("carte");
    carteARemplacer.dataset.value = cartepiocheValue;
    var classeCouleur = getColorClass(parseInt(cartepiocheValue));
    carteARemplacer.classList.add(classeCouleur);
    if (player.prisedansdefausse === true){
      defausse.pop(cartepiocheValue);
    }
    defausse.push(carteValue);

    

    console.log(
      "Les cartes suivantes sont dans la défausse",
      defausse,
      "(événement lié au rempalcement de carte dans la main d'un joueur",
    );
    actualiserDefausse(defausse);

    const piocheParent = document.getElementById("pioche");
    piocheParent.innerHTML = "";
  } else {
    if (player.turn === false) {
      console.log("Ce n'est pas encore à ton tour de jouer !");
    } else if (a_piocher === false) {
      console.log("Tu n'as pas encore pioché");
    } else if (!carteARemplacer) {
      console.log("La carte à remplacer n'a pas été trouvée");
    }
  }
});

socket.on("order_defausse_dela_carte_piochee", (cartepiocheValuedefausse) => {
  defausse.push(cartepiocheValuedefausse);
  cartepiocheValuedefausse = null;

  console.log(
    "Les cartes suivantes sont dans la défausse",
    defausse,
    "(événment lié à la défausse de la carte",
  );
  actualiserDefausse(defausse);
  const piocheParent = document.getElementById("pioche");
  piocheParent.innerHTML = "";
});

socket.on("order_joueur_retourne_carte", (carteretournee_id) => {
  const element = document.getElementById(carteretournee_id);
  element.classList.remove("face-cachee");
  var valeur = parseInt(element.dataset.value);
  var classeCouleur = getColorClass(valeur);
  element.classList.add(classeCouleur);

  isDefaussing = false;
});

socket.on("reinitialisationdefausse", () => {
  defausse = [];
  a_piocher = false;
  alert(
    "La pioche est vide ! Les cartes de la défausse ont été mélangés et remise dans la pioche :)",
  );
});

socket.on("carte_modifiee", (data) => {
  const { joueurId, carteId } = data;
  const carte = document.getElementById(carteId);
  if (carte) {
    carte.classList.remove("face-cachee");
    var valeur = parseInt(carte.textContent);
    var classeCouleur = getColorClass(valeur);
    carte.classList.add(classeCouleur);
  }
});

socket.on("order align col1", (div0, div4, div8) => {
  [div0, div4, div8].forEach(divId => {
    let divC = document.getElementById(divId);
    defausse.push(divC.dataset.value);
    divC.textContent = 99;
    divC.dataset.value = 0;
    divC.classList.remove(...divC.classList);
    divC.classList.add("carte")
    var valeur = parseInt(divC.textContent);
    var classeCouleur = getColorClass(valeur);
    divC.classList.add(classeCouleur);
  });
  actualiserDefausse(defausse)
});
socket.on("order align col2", (div1, div5, div9) => {
  [div1, div5, div9].forEach(divId => {
    let divC = document.getElementById(divId);
    defausse.push(divC.dataset.value);
    divC.textContent = 99;
    divC.dataset.value = 0;
    divC.classList.remove(...divC.classList);
    divC.classList.add("carte")
    var valeur = parseInt(divC.textContent);
    var classeCouleur = getColorClass(valeur);
    divC.classList.add(classeCouleur);
  });
  actualiserDefausse(defausse)
});
socket.on("order align col3", (div2, div6, div10) => {
  [div2, div6, div10].forEach(divId => {
    let divC = document.getElementById(divId);
    defausse.push(divC.dataset.value);
    divC.textContent = 99;
    divC.dataset.value = 0;
    divC.classList.remove(...divC.classList);
    divC.classList.add("carte")
    var valeur = parseInt(divC.textContent);
    var classeCouleur = getColorClass(valeur);
    divC.classList.add(classeCouleur);
  });
  actualiserDefausse(defausse)
});
socket.on("order align col4", (div3, div7, div11) => {
  [div3, div7, div11].forEach(divId => {
    let divC = document.getElementById(divId);
    defausse.push(divC.dataset.value);
    divC.textContent = 99;
    divC.dataset.value = 0;
    divC.classList.remove(...divC.classList);
    divC.classList.add("carte")
    var valeur = parseInt(divC.textContent);
    var classeCouleur = getColorClass(valeur);
    divC.classList.add(classeCouleur);
  });
  actualiserDefausse(defausse)
});

socket.on("order_end_round", (playerId) => {
  console.log(playerId, "est le joueur qui a mis fin au tour")
  setTurnMessage ("alert-info", "alert-success", "Le joueur avec l'ID : " + playerId + " a mis fin à son tour.")
  liste_joueurs.forEach(function(player) {
    if (player.socketId === playerId) {
      player.finisher = true;
    }
  });
  
  check_victory(liste_joueurs)
  socket.emit("newround", liste_joueurs)
})
socket.on("order_info2", (playerId) => {
  setTurnMessage("alert-info", "alert-success", `Toutes les cartes du joueur <span style="font-weight: bold;">${playerId}</span>  sont visibles ! Dernier tour pour les autres joueurs!`)
})

///////////////////////////////////////////////////////////////////////////
// CREATION DES FONCTIONS & ELEMENTS DU GAMEBOARD  ////////////////////////

function remplacerDansLeJeu(carte, display_carte_piochee) {
  // Logique pour remplacer la carte dans le jeu
  console.log("Le joueur a choisi de remplacer la carte dans son jeu.");
  // Mettez ici le code pour remplacer la carte dans le jeu du joueur
  if (player.turn === true && a_piocher === true) {
    socket.emit(
      "swap_carte",
      carte.dataset.value,
      display_carte_piochee.dataset.value,
      carte.id,
    );
    player.turn = false;
    display_carte_piochee = null;
    azy = null;
    player.isDefaussing = false;
    
  } else {
    console.log("Tu dois mettre fin à ton tour !");
  }
}

function defausserLaCarte(display_carte_piochee) {
  // Logique pour défausser la carte et en piocher une autre
  console.log(
    "Le joueur a choisi de défausser la carte et de retrouner une carte de son jeu.",
  );
  socket.emit(
    "defausse_dela_carte_piochee",
    display_carte_piochee.dataset.value,
  );
  display_carte_piochee = null;
  if (player.isDefaussing) {
    const cartesDansLaMain = document.querySelectorAll(
      ".maindesjoueurs .hand .carte",
    );
    cartesDansLaMain.forEach((carte_retournee) => {
      carte_retournee.addEventListener("click", () => {
        if (player.isDefaussing) {
          if (player.turn === true && a_piocher === true) {
            socket.emit("joueur_retourne_carte", carte_retournee.id);
            console.log(
              "Le joueur a retournée la carte à l'id suivant:",
              carte_retournee.id,
              "et à la valeur:",
              carte_retournee.dataset.value,
            );
            player.turn = false;
            display_carte_piochee = null;
            azy = null;
            player.isDefaussing = false;


          } else {
            console.log("Tu dois mettre fin à ton tour !");
          }
        }
      });
    });
  }
}

function startGame(players) {
  restartArea.classList.add("d-none"); //cache le bouton rejouer quand on lancer une partie
  waitingArea.classList.add("d-none"); //cache la zone d'attente du salon
  numPlayersInput.classList.add("d-none");
  gameCard.classList.remove("d-none"); //affiche la zone du jeu (zone récupéré avec l'id "game-card")
  turnMsg.classList.remove("d-none"); //affiche la zone du message de tour (zone récupéré avec l'id "turn-message
  players.forEach(player => {
      usernames.push(player.username);
  });
  creerTableau(usernames);

}


function showRestartArea() {
  if (player.host) {
    restartArea.classList.remove("d-none");
  }
}

function setTurnMessage(classToRemove, classToAdd, html) {
  turnMsg.classList.remove(classToRemove);
  turnMsg.classList.add(classToAdd);
  turnMsg.innerHTML = html;
}

const joinRoom = function () {
  if (usernameInput.value !== "") {
    //une fois que le joueur a écrit son username dans le div au dessus :
    player.username = usernameInput.value;
    player.socketId = socket.id;
    player.roomId = this.dataset.room; //ajoute l'id de la room sur lequel il a cliqué au joueur

    socket.emit("playerData", player);

    userCard.hidden = true;
    waitingArea.classList.remove("d-none");
    roomsCard.classList.add("d-none");
  }
};

playerCartes.forEach(function (carte) {
  var valeur = parseInt(carte.textContent);
  var classeCouleur = getColorClass(valeur);
  carte.classList.add(classeCouleur);
});

function getColorClass(valeur) {
  if (valeur === -1) {
    return "carte--1";
  } else if (valeur === -2) {
    return "carte--2";
  } else if (valeur === 0) {
    return "carte-0";
  } else if (valeur === 1) {
    return "carte-1";
  } else if (valeur === 2) {
    return "carte-2";
  } else if (valeur === 3) {
    return "carte-3";
  } else if (valeur === 4) {
    return "carte-4";
  } else if (valeur === 5) {
    return "carte-5";
  } else if (valeur === 6) {
    return "carte-6";
  } else if (valeur === 7) {
    return "carte-7";
  } else if (valeur === 8) {
    return "carte-8";
  } else if (valeur === 9) {
    return "carte-9";
  } else if (valeur === 10) {
    return "carte-10";
  } else if (valeur === 11) {
    return "carte-11";
  } else if (valeur === 12) {
    return "carte-12";
  } else {
    return "bizzare";
  }
}

function actualiserDefausse(defausse) {
  const defausseParent = document.getElementById("defausse");
  const labelDefausse = document.createElement("p");
  labelDefausse.textContent = "Defausse";
  labelDefausse.classList.add("label");

  // Effacer le contenu précédent de defausseParent
  defausseParent.innerHTML = "";

  // Ajouter le label au début de defausseParent
  // defausseParent.appendChild(labelDefausse);

  defausse.forEach((carte) => {
    const divCarte = document.createElement("div");
    divCarte.classList.add("carte");
    divCarte.dataset.value = carte;
    var valeur = parseInt(carte);
    var classeCouleur = getColorClass(valeur);
    divCarte.classList.add(classeCouleur);
    defausseParent.appendChild(divCarte);
  });
  $(".defausse .carte").addClass("d-none");
  $(".defausse .carte").last().removeClass("d-none");
}

function majcouleur() {
  var playerCartes = document.querySelectorAll(".maindesjoueurs .hand .carte");
  playerCartes.forEach(function (carte) {
    var valeur = parseInt(carte.textContent);
    var classeCouleur = getColorClass(valeur);
    carte.classList.add(classeCouleur);
  });
  var playerCartesX = document.querySelectorAll(".defausse .carte");
    playerCartesX.forEach(function (carte) {
    var valeur = parseInt(carte.textContent);
    var classeCouleur = getColorClass(valeur);
    carte.classList.add(classeCouleur);
  });
}

function checkalign() {
  let divJoueur = document.getElementById("joueur" + player.socketId);
  
  var div0 = divJoueur.querySelectorAll('[id$="_0"]');
  var div4 = divJoueur.querySelectorAll('[id$="_4"]');
  var div8 = divJoueur.querySelectorAll('[id$="_8"]');
  var vdiv0 = parseInt(div0[0].dataset.value);
  var vdiv4 = parseInt(div4[0].dataset.value);
  var vdiv8 = parseInt(div8[0].dataset.value);



  var div1 = divJoueur.querySelectorAll('[id$="_1"]');
  var div5 = divJoueur.querySelectorAll('[id$="_5"]');
  var div9 = divJoueur.querySelectorAll('[id$="_9"]');
  var vdiv1 = parseInt(div1[0].dataset.value);
  var vdiv5 = parseInt(div5[0].dataset.value);
  var vdiv9 = parseInt(div9[0].dataset.value);


  var div2 = divJoueur.querySelectorAll('[id$="_2"]');
  var div6 = divJoueur.querySelectorAll('[id$="_6"]');
  var div10 = divJoueur.querySelectorAll('[id$="_10"]');
  var vdiv2 = parseInt(div2[0].dataset.value);
  var vdiv6 = parseInt(div6[0].dataset.value);
  var vdiv10 = parseInt(div10[0].dataset.value);

 
  var div3 = divJoueur.querySelectorAll('[id$="_3"]');
  var div7 = divJoueur.querySelectorAll('[id$="_7"]');
  var div11 = divJoueur.querySelectorAll('[id$="_11"]');
  var vdiv3 = parseInt(div3[0].dataset.value);
  var vdiv7 = parseInt(div7[0].dataset.value);
  var vdiv11 = parseInt(div11[0].dataset.value);



  if (vdiv0 === vdiv4 && vdiv4 === vdiv8 && !div0[0].classList.contains('face-cachee') && !div4[0].classList.contains('face-cachee') && !div8[0].classList.contains('face-cachee')){
    console.log("aligné !")
    console.log(div0[0].id)
    socket.emit('align col1', div0[0].id, div4[0].id, div8[0].id)
  }


  if (vdiv1 === vdiv5 && vdiv5 === vdiv9 && !div1[0].classList.contains('face-cachee') && !div5[0].classList.contains('face-cachee')&& !div9[0].classList.contains('face-cachee')){
    console.log("aligné !")
    socket.emit('align col2', div1[0].id, div5[0].id, div9[0].id)
  }

  
  if (vdiv2 === vdiv6 && vdiv6 === vdiv10 && !div2[0].classList.contains('face-cachee') && !div6[0].classList.contains('face-cachee')&& !div10[0].classList.contains('face-cachee')){
    console.log("aligné !")
    socket.emit('align col3', div2[0].id, div6[0].id, div10[0].id)
  }

  
  if (vdiv3 === vdiv7 && vdiv7 === vdiv11 && !div3[0].classList.contains('face-cachee')&& !div7[0].classList.contains('face-cachee')&& !div11[0].classList.contains('face-cachee')){
    console.log("aligné !")
    socket.emit('align col4', div3[0].id, div7[0].id, div11[0].id)
  }
}

function check_allfacevisible() {
  const cartesJoueur = document.querySelectorAll(`[id^="carte_xxx_${player.socketId}"]`);
  let toutesVisibles = true;

  cartesJoueur.forEach(carte => {
    if (carte.classList.contains('face-cachee')) {
      toutesVisibles = false;
    }
  });

  if (toutesVisibles) {
    console.log(`Toutes les cartes du joueur ${player.socketId} (${player.username}) sont visibles !`);
    //alert(`Toutes les cartes du joueur ${player.socketId}  (${player.username}) sont visibles !`);
    setTurnMessage("alert-info", "alert-success", `Toutes les cartes du joueur  ${player.username} sont visibles ! Dernier tour pour les autres joueurs!`)
    socket.emit("info2", player.username);
    player.finisher = true
  }
}

function check_victory(liste_joueurs) {
    var index = 0
    liste_joueurs.forEach(function(player) {
        var cartesJoueur = document.querySelectorAll('[id^="carte_xxx_' + player.socketId + '"]');
        var pointsJoueur = 0;
        player.points = 0;
        cartesJoueur.forEach(function(carte) {
            pointsJoueur += parseInt(carte.dataset.value);
        });

        player.points = pointsJoueur;
        player.total_points = player.total_points + pointsJoueur;
        console.log(`Le joueur ${player.username} possède ${player.points} points.`);
        var scoreElement = document.getElementById('score_' + index);
        if (scoreElement) {
            scoreElement.textContent = `${player.total_points}`;
        }
        index = index + 1;
      
    });
    var finisher = liste_joueurs.find(function(player) {
        return player.finisher === true;
    });
    var finisherIndex = liste_joueurs.findIndex(function(player) {
        return player.finisher === true;
    });
    if (finisher) {
        console.log(finisher); // Vérifiez si finisher est défini
  
        var moinsDePointsQueLesAutres = true;
  
        liste_joueurs.forEach(function(player) {
            if (player !== finisher && player.points <= finisher.points) {
                moinsDePointsQueLesAutres = false;
            }
        });
  
        if (moinsDePointsQueLesAutres) {
            console.log(`${finisher.username} a moins de points que les autres joueurs.`);
            setTurnMessage ("alert-info", "alert-success", ` <span style="font-weight: bold;">${finisher.username}</span> a moins de points que les autres joueurs. Début de la nouvelle manche...`)

        } else {
          finisher.total_points = finisher.total_points + finisher.points
            finisher.points *= 2; // Double les points du finisher
            console.log(`${finisher.username} n'a pas moins de points que les autres joueurs. Ses points sont doublés. Il a désormais <span style="font-weight: bold;">${finisher.points}</span> points.`);
          setTurnMessage ("alert-info", "alert-success", `   <span style="font-weight: bold;">${finisher.username}</span> n'a pas moins de points que les autres joueurs. Ses points sont doublés. Il a désormais <span style="font-weight: bold;">${finisher.points}</span> points. Début de la nouvelle manche...`)
          var scoreElement = document.getElementById('score_' + finisherIndex);
          if (scoreElement) {
              scoreElement.textContent = finisher.total_points;
          }
        }
      
    } else {
        console.log("Aucun joueur n'est défini comme finisher.");
    }
  
}

function check() {
    const cartesJoueur = document.querySelectorAll('[id^="carte_xxx_' + player.socketId + '"]');
    cartesJoueur.forEach(function(carte) {
        carte.classList.remove('face-cachee');
    });
}

function creerTableau(listeDesJoueurs) {

  var tableau = "<table border='1'>";
  tableau += "<tr><th>Pseudo</th><th>Score</th></tr>";

  // Boucle à travers la liste des joueurs
  for (var i = 0; i < listeDesJoueurs.length; i++) {
      tableau += "<tr>";
      tableau += "<td>" + listeDesJoueurs[i] + "</td>";
      tableau += "<td id='score_" + i + "'></td>"; // Ajout d'un ID dynamique pour chaque cellule de score
      tableau += "</tr>";
  }

  tableau += "</table>";
  document.getElementById("tableauJoueurs").innerHTML = tableau;
  
}
