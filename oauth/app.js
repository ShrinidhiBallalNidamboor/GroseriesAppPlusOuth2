const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const cors = require('cors'); // Import the cors middleware


app.use(cors());
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
const PORT = 4000;
var url_back = 'http://localhost:4000/'

// MongoDB connection
mongoose.connect('mongodb://localhost/oauth2_example', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

const secretKey = 'yourSecretKey';

// Function to encrypt a variable
function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', secretKey);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Function to decrypt an encrypted variable
function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}



// Enable parsing of JSON bodies
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/oauth", function (req, res) {
  // Assuming 'url_back' is a global variable
  url_back = req.query.url;
  console.log(url_back)
  // Redirect to the 'index' page
  res.redirect("/index");
});

// Assuming you have a route for rendering the 'index' page
app.get("/index", function (req, res) {
  res.render("index");
});

// Authorization server endpoints

// Registration endpoint
app.post('/register', async (req, res) => {
  const username = req.body.Username
  const password = req.body.Password
  const role = req.body.Role
  // Check if the user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Create a new user
  const newUser = new User({ username, password, role });
  await newUser.save();

  console.log('User registered successfully');
  res.redirect("/");
});


app.post('/login', async (req, res) => {
  const username = req.body.Username;
  const password = req.body.Password;

  // c//onsole.log(req.body)
  try {
    // Check if the user exists
    const user = await User.findOne({ username, password });

    //console.log(user)
    if (!user) {
      console.log('Invalid credentials');
      return res.redirect("/");
    }

    // Generate an authorization code
    const authorizationCode = encrypt(jwt.sign({ username: user.username, role: user.role }, 'your-secret-key', { expiresIn: '1h' }));

    // Redirect to localhost:3000/loginOauth with the authorization code
    res.redirect(`http://localhost:3000/loginOauth?code=${authorizationCode}`);
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/getToken', async (req, res) => {
  try {
    const authorizationCode = req.body.code;
    //console.log(authorizationCode)
    const jsonToken = decrypt(authorizationCode)
    //console.log("hi", jsonToken)
    res.json(jsonToken);

  } catch (error) {
    console.error('Error during token retrieval:', error.message);
    res.status(500).json({ error: 'Token Retrieval Failed' });
  }
});

app.post('/verify', async (req, res) => {
  try {
    const jsonToken = req.body.token;

    // Verify and decode the token
    const decoded = jwt.verify(jsonToken, 'your-secret-key');

    // Perform any additional verification logic if needed

    res.json(decoded);
  } catch (error) {
    console.error('Error during token verification:', error.message);
    res.status(500).json({ error: 'Token Verification Failed' });
  }
});



// Login endpoint
// app.post('/login', async (req, res) => {
//   const username = req.body.Username
//   const password = req.body.Password

//   // Check if the user exists
//   const user = await User.findOne({ username, password });
//   if (!user) {
//     console.log('Invalid credentials');
//     return res.redirect("/");
//   }

//   // Generate and return an access token
//   const accessToken = encrypt(jwt.sign({ username: username, role: user.role }, 'your-secret-key', { expiresIn: '1h' }));

//   try {
//     const tokenObject = {
//       accessToken: accessToken

//     };
//     // Convert the object to a JSON string
//     const jsonTemporalToken = JSON.stringify(tokenObject);
//     // Make a POST request to another server
//     console.log(url_back)
//     if (url_back != 'http://localhost:4000/') {
//       console.log(url_back)
//       const response = await axios.post(url_back, jsonTemporalToken);
//       // Process the response from the other server
//       //const responseData = response.data;
//       //res.status(200).json({ success: true, data: responseData });
//     }
//     else {
//       console.log('Invalid Operation')
//     }
//   } catch (error) {
//     console.error('Error:', error.message);
//   }
//   res.redirect("/");
// });

// app.post('/getToken', async (req, res) => {
//   const jsonTemporalToken = req.body
//   const jsonToken = decrypt(jsonTemporalToken)
//   res.json(jsonToken);
// });

// app.post('/verify', async (req, res) => {
//   const jsonToken = req.body
//   const tokenObject = JSON.parse(jsonToken);
//   const decoded = jwt.verify(tokenObject, 'your-secret-key');
//   res.json(decoded);
// });




// Start the server
app.listen(PORT, () => {
  console.log(`Authorization server listening on port ${PORT}`);
});