const dotenv = require('dotenv');
const {google} = require('googleapis');
const driveClient = require('drive-appdata-client'); // importing package
const fs = require('fs');
const readline = require('readline-sync');
const http = require('http');
var url = require('url');

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata','https://www.googleapis.com/auth/userinfo.email']
const credentials = { client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, redirect_uris: process.env.REDIRECT_URIS }

const sampleJsonData = '{"test":"1"}';

//create google auth client
const auth = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, credentials.redirect_uris);
try{
obtainTokens(auth).then(tokens =>
{
    auth.setCredentials(tokens);
    const drive = new driveClient(auth, true); // creating drive client
    commandPrompt(drive);
});
}catch(err){
    console.log(err);
}

async function commandPrompt(drive) {
    let command;
    while (command !== 'quit') {
        if(command === 'find') {
            await findFile(drive);
        } else if (command === 'update') {
            await updateFile(drive);
        } else if (command === 'create') {
            await createFile(drive);
        } else if (command === 'get') {
            await getFile(drive);
        }
        command = readline.question('Enter command [quit|find|update|create|get]:');
    }
}

async function findFile(drive) {
    const filename = readline.question('Enter filename to find: ');
    try{
        const files = await drive.find(filename);
        console.log(`${files.length} files found`);
        if(files.length) {
            console.log(files);
        }
    }
    catch(error){
        console.log(error);
    }
}

async function updateFile(drive) {
    const fileId = readline.question('Enter file id to update (can be found by calling find command): ');
    let data = readline.question(`Enter JSON data to update file with or press ENTER to go with the default ${sampleJsonData}: `);
    if(!data){
        data = sampleJsonData;
    }
    try{
        const result = await drive.update(fileId, data);
        console.log(result);
    }
    catch(error){
        console.log(error);
    }
}

async function createFile(drive) {
    const fileName = readline.question('Enter file name to create: ');
    let data = readline.question(`Enter JSON data for new file with or press ENTER to go with the default ${sampleJsonData}: `);
    if(!data){
        data = sampleJsonData;
    }
    try{
        const result = await drive.create(fileName, data);
        console.log(result);
    }
    catch(error){
        console.log(error);
    }
}

async function getFile(drive) {
    const fileId = readline.question('Enter fileId: ');
    try{
        const result = await drive.get(fileId);
        console.log(result);
    }
    catch(error){
        console.log(error);
    }
}

async function obtainTokens(authClient) {
    //if we already have user tokens stored then use it otherwise instruct user to obtain access code and exchange code for tokens
    let tokens;
    try{
        const filedata = fs.readFileSync('tokens.json');
        tokens = JSON.parse(filedata);
    }catch(err){
        if (err.code === 'ENOENT'){
          const url = authClient.generateAuthUrl({access_type: 'offline', scope: SCOPES, prompt: 'consent'});
            console.log(`CLick link to obtain access token: ${url}`);

            const access_code = await recieveAccessCode();

            const result = await authClient.getToken(access_code);
            tokens = result.tokens;
            fs.writeFileSync('tokens.json', JSON.stringify(tokens));  
        } else {
            console.log('Error reading tokens.json file', err)
        }
    }
    return tokens;
}

function recieveAccessCode(){
    //spin a temporary http server to receive access code
    return new Promise((resolve,reject) =>{
        const app = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            const query = url.parse(req.url, true).query;                     
            if(query.code) {
                res.end('Token Received');
                app.close(); 
                resolve(query.code);
            } else {
                res.end('Token not found in request');
            }
        });
        app.listen(8085);        
    });
}

