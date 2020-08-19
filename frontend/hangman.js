let token = null;

const tokenKey = "hangmanToken";
let secretWord = [];
let secretWordEl = null;
let numberOfGuessesAllowedEl = null;
let numberOfGuessesMadeEl = null;
let messageEl = null;
let gamesWonEl = null;
let gamesLostEl = null;
let startGameEl = null;
let statsEl = null;
let hangmanImageEl = null;
const SERVER_URL = 'http://localhost:3000';


//Assigns buttons from HTML to global variables, sets up the div containing all the letters, initiates the session if needed or uses found token to setup
document.addEventListener("DOMContentLoaded", function(event) { 
	secretWordEl = document.getElementById('secretWord');
	numberOfGuessesAllowedEl = document.getElementById('numberOfGuessesAllowed');
	numberOfGuessesMadeEl = document.getElementById('numberOfGuessesMade');
	messageEl = document.getElementById('messageElement');
	gamesWonEl = document.getElementById('gamesWon');
	gamesLostEl = document.getElementById('gamesLost');
	startGameEl = document.getElementById('startGame');
	statsEl = document.getElementById('stats');
	hangmanImageEl = document.getElementById('hangmanImage');
	createAlphabetHTML();
	const savedToken = window.localStorage.getItem(tokenKey); //checks for saved local token
	if (savedToken) {
		token = savedToken;
		getUserData(token);
	} else {
		initSession();
	}
});


//Creates the alphabet and sets disabled buttons for them in the HTML div and sets an onclick listener to check
function createAlphabetHTML() {
	const letterContainer = document.getElementById("letters");
	const alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
	
	for (let i = 0; i < alphabet.length; i++) {
		const childEl = document.createElement("button");
		childEl.addEventListener('click', function() {
			validateLetter(alphabet[i]);
		})
		childEl.style = "width: 35px; height: 35px; margin-right: 10px;";
		childEl.innerHTML = alphabet[i];
		childEl.disabled = true;
		letterContainer.appendChild(childEl);
	}

}


//Retrieves all letter elements inside the HTML div and enables them
function enableAllLetters(enabled) {
	const letterContainer = document.getElementById("letters");
	for (let i = 0; i < letterContainer.childNodes.length; i++) {
		const child = letterContainer.childNodes[i];
		child.disabled = !enabled;
	}
}


//Checks all letter elements inside the HTML div for matching text and enables/disables accordingly
function enableLetter(letter, enabled) {
	const letterContainer = document.getElementById("letters");
	for (let i = 0; i < letterContainer.childNodes.length; i++) {
		const child = letterContainer.childNodes[i];
		if (child.innerHTML === letter) {
			child.disabled = !enabled;
		}
	}
}


//Gets the user data based on token they had saved locally
function getUserData(token) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
	  if (xhr.status >= 200 && xhr.status < 300) {
	    const response = JSON.parse(xhr.response);

	    if (response.session.gamesWon !== undefined) {
	    	updateGamesWonElement(response.session.gamesWon);
	  	}

	  	if (response.session.gamesLost !== undefined) {
	    	updateGamesLostElement(response.session.gamesLost);
	  	}
	  	refreshStats();
	  } else {
	    console.log('The request failed!');
	  }
	};

	xhr.open('GET', SERVER_URL + '/getUserData/' + token);
	xhr.send();
}


//Initiates the session, updates games won and lost based on database info
function initSession() {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
	  if (xhr.status >= 200 && xhr.status < 300) {
	    const response = JSON.parse(xhr.response);
	    token = response.token;
	    window.localStorage.setItem(tokenKey, token); //sets given token as local storage token for future use

	    if (response.session.gamesWon !== undefined) {
	    	updateGamesWonElement(response.session.gamesWon);
	  	}

	  	if (response.session.gamesLost !== undefined) {
	    	updateGamesLostElement(response.session.gamesLost);
	  	}
	  	refreshStats();
	  } else {
	    console.log('The request failed!');
	  }
	};

	xhr.open('GET', SERVER_URL + '/initSession');
	xhr.send();
}


//Checks if the letter is valid and updates UI (hangman) accordingly or displays winning/losing messages
function validateLetter(letter) {
	enableLetter(letter, false);
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
	  if (xhr.status >= 200 && xhr.status < 300) {
	    const jsonObject = JSON.parse(xhr.response);
	    if (jsonObject.success) {	// user guesses letter(s)
	    	const indices = Object.keys(jsonObject.correctGuessIndices);
	    	for (let i = 0; i < indices.length; i++) {
	    		const index = parseInt(indices[i]);
	    		secretWord[index] = jsonObject.correctGuessIndices[index];
	    	}
	    	updateSecretWordElement(secretWord);
	    }
	    if (jsonObject.lostGame || jsonObject.gameWon) {
	    	enableAllLetters(false);
	    	updateStartGameButtonText('Start another game!');
	    	refreshStats();
	    }

	    if (jsonObject.noGuessesAllowed !== undefined) {
	    	hangmanImageEl.src = "./images/" + (jsonObject.totalGuessesAllowed + 1 - jsonObject.noGuessesAllowed) + ".png";
	    	updateNoGuessesAllowedElement(jsonObject.noGuessesAllowed);
	    }

	    if (jsonObject.noGuessesMade !== undefined) {
	    	updateNoGuessesMadeElement(jsonObject.noGuessesMade);
	    }

	    if (jsonObject.message !== undefined) {
	    	updateMessageElement(jsonObject.message);
	    }

	    if (jsonObject.gamesWon !== undefined) {
	    	updateGamesWonElement(jsonObject.gamesWon);
	    }	    
	    
	    if (jsonObject.gamesLost !== undefined) {
	    	updateGamesLostElement(jsonObject.gamesLost);
	    }

	    if (jsonObject.gamesWon !== undefined) {
	    	updateGamesWonElement(jsonObject.gamesWon);
	  	}

	  	if (jsonObject.gamesLost !== undefined) {
	    	updateGamesLostElement(jsonObject.gamesLost);
	  	}
	  } else {
	    console.log('The request failed!');
	  }
	};
	const url = SERVER_URL + '/isValidWord/' + letter + '/' + token;
	xhr.open('GET', url);
	xhr.send();
}


//Update text fields and buttons on the UI
function updateSecretWordElement(secretWord) {
	secretWordEl.innerHTML = secretWord.join(" ");
}

function updateNoGuessesAllowedElement(noGuessesAllowed) {
	numberOfGuessesAllowedEl.innerHTML = noGuessesAllowed;
}

function updateNoGuessesMadeElement(noGuessesMade) {
	numberOfGuessesMadeEl.innerHTML = noGuessesMade;
}

function updateMessageElement(message) {
	messageEl.innerHTML = message;
}

function updateGamesWonElement(gamesWon) {
	gamesWonEl.innerHTML = gamesWon;
}

function updateGamesLostElement(gamesLost) {
	gamesLostEl.innerHTML = gamesLost;
}

function updateStartGameButtonText(newText) {
	startGameEl.innerHTML = newText;
}
//END


//Updates the database stats section UI based on back end response
function refreshStats() {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
	  if (xhr.status >= 200 && xhr.status < 300) {
	    const jsonObject = JSON.parse(xhr.response);
	    statsEl.innerHTML = "";
	    for (let i = 0; i < jsonObject.length; i++) {
	    	const user = jsonObject[i];
	    	const userSession = user.userSession;
	    	const stat = document.createElement("p");
	    	stat.innerHTML = "Token: " + user.token + " - " + " Games Won: " + userSession.gamesWon + " Games Lost: " + userSession.gamesLost;
	    	statsEl.appendChild(stat)
	    }
	  } else {
	    console.log('The request failed!');
	  }
	};
	const url = SERVER_URL + '/getUserSessions';
	xhr.open('GET', url);
	xhr.send();
}


//Calls to clear user's session data on the backend and then front end
function clearSessions() {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
	  if (xhr.status >= 200 && xhr.status < 300) {
	    refreshStats();
	    updateGamesWonElement(0);
	    updateGamesLostElement(0);
	  } else {
	    console.log('The request failed!');
	  }
	};
	const url = SERVER_URL + '/clearUserSessions';
	xhr.open('GET', url);
	xhr.send();
}


//Creates starter image, gets length of secret word and places blanks, sets default values on UI for fields received from server
function startGame() {
	secretWord = [];
	hangmanImageEl.src = "./images/1.png";
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
	  if (xhr.status >= 200 && xhr.status < 300) {
	    const jsonObject = JSON.parse(xhr.response);
	    for (let i = 0; i < jsonObject.secretWordLength; i++) {
	    	secretWord.push("_");
	    }

	    updateStartGameButtonText('Quit/Restart Game');
	    enableAllLetters(true)
	    updateSecretWordElement(secretWord);
	    updateNoGuessesAllowedElement(jsonObject.noGuessesAllowed);
	    updateNoGuessesMadeElement(jsonObject.noGuessesMade);
	    if (jsonObject.gamesWon !== undefined) {
	    	updateGamesWonElement(jsonObject.gamesWon);
	  	}

	  	if (jsonObject.gamesLost !== undefined) {
	    	updateGamesLostElement(jsonObject.gamesLost);
	  	}
	  } else {
	    console.log('The request failed!');
	  }
	};
	const url = SERVER_URL + '/startGame/' + token;
	xhr.open('GET', url);
	xhr.send();
}