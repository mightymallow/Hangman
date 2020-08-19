const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const uuidv4 = require('uuid/v4');
const port = 3000;
var randomWords = require('random-words');

let sessions = {};

let database = null;
const databaseName = "hangmanDb";
const userCollection = "HangmanUsers"
const HANGMAN_WORDS = randomWords(5);
const TOTAL_GUESSES_ALLOWED = 10;
var MongoClient = require('mongodb').MongoClient;

const mongoUrl = 'mongodb://localhost:27017/';
MongoClient.connect(mongoUrl, function(err, dbo) {
	if (err) throw err;
	database = dbo.db(databaseName);
	const collection = database.collection(userCollection);
	loadSessionsFromDB();
});

// load all sessions from database into the 'sessions' variable
function loadSessionsFromDB() {
	const collection = database.collection(userCollection);
	collection.find({}).toArray(function (err, resp) { // Gives full results of collection
		if (err) { throw err; }
		for (let i = 0; i < resp.length; i++) {
			const obj = resp[i];
			sessions[obj.token] = obj.userSession;
		}
	});
}

//save user session to DB
function saveSessionToDB(token, userSession) {
	const collection = database.collection(userCollection);
	collection.find({ token: token }).toArray(function (err, findResp) { // Only returns objects that match token key
		if (err) {
			console.log('error saving user session to the collection');
			return;
		}
		const data = { token: token, userSession: userSession }; // format of data in database collection
		if (!findResp.length) {
			collection.insertOne(data, function (err, resp) {
				if (err) {
					console.log('error inserting user session into collection');
					return;
				}
			});
		} else if (findResp.length === 1) {
			const query = { token: token };
 			const newValue = { $set: { token: token, userSession: userSession } };
			collection.updateOne(query, newValue, function (err, resp) {
				if (err) {
					console.log('error updating user session');
					return;
				}
			});
		} else {
			console.log('error, found too many results with same token');
		}
	})
}


//Retrieves a user's session data based on token key, if doesn't exist then creates a session
function getUserSession(token, res) {
	if (!token) {
		res.send({
			message: 'Please send a token!!!'
		});
		return null;
	}
	let userSession = sessions[token];
	if (!userSession) {
		userSession = createSessionData(token);
		return userSession;
	}
	return userSession;
}


//Creates a blank session object in JSON format and adds it to the sessions array using the given unique token
function createSessionData(token) {
	const session = {
		gamesWon: 0,
		gamesLost: 0,
		gameInProgress: false
	};
	sessions[token] = session;
	return session;
}


//Chooses a random word from the word bank and assigns default values to fields
function createGameData() {
	const secretIndex = Math.floor(Math.random() * (HANGMAN_WORDS.length));
	return {
		secretWord: HANGMAN_WORDS[secretIndex],
		lettersGuessed: [],
		correctLetterGuesses: 0,
		noGuessesAllowed: TOTAL_GUESSES_ALLOWED,
		noGuessesMade: 0
	};
}


//Creates a random token and session, then sends back info to the requester
app.get('/initSession', (req, res) => {
	const token = uuidv4();
	const session = createSessionData(token);
	
	res.send({
		success: true,
		token: token,
		session: session
	});
});

app.get('/getUserData/:token', (req, res) => {
	const token = req.params.token;
	const session = getUserSession(token, res);
	
	res.send({
		success: true,
		session: session
	});
});


//Retrieves a user's session from the database
app.get('/getUserSessions', (req, res) => {
	const collection = database.collection(userCollection);
	collection.find({}).toArray(function (err, resp) {
		if (err) { throw err; }
		res.send(JSON.stringify(resp));
	});
});


//Removes a user's session from the database
app.get('/clearUserSessions', (req, res) => {
	const collection = database.collection(userCollection);
	sessions = {};
	collection.drop();
	res.send({
		success: true
	});
});


//Checks token and session validity,  assigns starting game data to user session, returns necessary information in JSON format
app.get('/startGame/:token', (req, res) => {
	const token = req.params.token;
	let userSession = getUserSession(token, res);
	if (!userSession){
		return;
	}

	if (userSession.gameInProgress) {
		userSession.gamesLost++;
	}

	userSession.game = createGameData();
	userSession.gameInProgress = true;
	sessions[token] = userSession;
	saveSessionToDB(token, userSession);

	const secretWordLength = userSession.game.secretWord.length;
	const response = {
		secretWordLength: secretWordLength,
		noGuessesAllowed: userSession.game.noGuessesAllowed,
		noGuessesMade: userSession.game.noGuessesMade,
		gamesWon: userSession.gamesWon,
		gamesLost: userSession.gamesLost,
		totalGuessesAllowed: TOTAL_GUESSES_ALLOWED
	};
	res.send(response);
	return;
});


//Main function to check for letter and update everything accordingly
app.get('/isValidWord/:letter/:token', (req, res) => {
	const token = req.params.token;
	const userSession = getUserSession(token, res);

	/* TECHNICALLY SHOULD NEVER REACH ANY OF THE BELOW SCENARIOS */
	if (!userSession.gameInProgress) { //checks game progress
		res.send({
			message: 'Please start a game first!'
		});
		return;
	}

	if (!userSession){ //checks to make sure user has a session
		return;
	}

	const letter = req.params.letter;
	if (userSession.game.noGuessesAllowed < 1) { //checks to make sure user still has
		res.send({
			message: 'You have no guesses left!'
		});
		return;
	}

	if (letter.length != 1) { //checks to make sure valid request is sent to server
		res.send({
			success: false,
			message: 'invalid input to server'
		});
		return;
	}

	if (userSession.game.lettersGuessed.includes(letter)) { //checks to see if the letter has been guessed correctly
		res.send({
			message: "You've already guessed this letter"
		});
		return;
	}
	/* TECHNICALLY SHOULD NEVER REACH ANY OF THE ABOVE SCENARIOS */


	userSession.game.lettersGuessed.push(letter);
	var secretWordRegex = new RegExp(letter);
	var guessIsCorrect = secretWordRegex.test(userSession.game.secretWord); //checks if secret word contains the guessed letter
	if (guessIsCorrect) {

		let counter = 0;
		let correctGuessIndices = {};
		for (let i = 0; i < userSession.game.secretWord.length; i++) { // counts how many letters match the guessed letter
			const l = userSession.game.secretWord[i];
			if (letter === l) {
				correctGuessIndices[i] = letter;
				counter++;
			}
		}

		userSession.game.correctLetterGuesses += counter; //update correct letter guesses and guesses made
		userSession.game.noGuessesMade++;

		if (userSession.game.correctLetterGuesses === userSession.game.secretWord.length) { //checks if game has been won
			userSession.gameInProgress = false;
			userSession.gamesWon++;
			sessions[token] = userSession;
			res.send({
				success: true,
				gameWon: true,
				secretWord: userSession.game.secretWord,
				message: 'You won the game! Play again?',
				correctGuessIndices: correctGuessIndices,
				noGuessesMade: userSession.game.noGuessesMade,
				noGuessesAllowed: userSession.game.noGuessesAllowed,
				gamesWon: userSession.gamesWon,
				gamesLost: userSession.gamesLost,
				totalGuessesAllowed: TOTAL_GUESSES_ALLOWED
			});
			return saveSessionToDB(token, userSession); //saves info to DB
		}

		//Else if game is not over then send relevant info needed to update UI
		sessions[token] = userSession;
		res.send({
			success: true,
			message: 'Good Guess!',
			correctGuessIndices: correctGuessIndices,
			noGuessesMade: userSession.game.noGuessesMade,
			noGuessesAllowed: userSession.game.noGuessesAllowed,
			totalGuessesAllowed: TOTAL_GUESSES_ALLOWED
		});
		return;
	}

	//Else if the letter was not in the word update guesses made and allowed
	userSession.game.noGuessesMade++;
	userSession.game.noGuessesAllowed--;

	//Check if game is over and display secret word to UI, update DB with loss
	if (userSession.game.noGuessesAllowed < 1) {
		userSession.gameInProgress = false;
		userSession.gamesLost++;
		sessions[token] = userSession;
		res.send({
			success: false,
			lostGame: true,
			secretWord: userSession.game.secretWord,
			message: "You lost the game! The secret word was " + userSession.game.secretWord + "",
			noGuessesMade: userSession.game.noGuessesMade,
			noGuessesAllowed: userSession.game.noGuessesAllowed,
			gamesWon: userSession.gamesWon,
			gamesLost: userSession.gamesLost,
			totalGuessesAllowed: TOTAL_GUESSES_ALLOWED
		});
		return saveSessionToDB(token, userSession); //saves info to DB
	}

	//Else game is not over but guess was incorrect, send info to update UI
	sessions[token] = userSession;
	res.send({
		success: false,
		message: 'Incorrect Guess!',
		noGuessesMade: userSession.game.noGuessesMade,
		noGuessesAllowed: userSession.game.noGuessesAllowed,
		totalGuessesAllowed: TOTAL_GUESSES_ALLOWED
	});
	return;
});

app.listen(port, () => console.log(`App listening on port ${port}!`))
