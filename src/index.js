const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_PRESENCES] });
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./main.db');
require('dotenv').config();
client.login(process.env.DISCORD_BOT_TOKEN);
client.login(process.env.DISCORD_BOT_TOKEN);
client.guilds.fetch('828085716902477894'); // CHANGE TO CORRECT GUILD

client.on("ready", async () => {
    // Once a day (in milliseconds)
    console.log("ready");
    setInterval(chooseWinners,  1000 * 60 * 60 * 24); 
});

var winners = 5;
var keyPhrase = "Discord.gg/Runestake";

///// CHANGE TO CORRECT ROLE
client.on('message', (message) => {
        if (message.content.toLowerCase().startsWith("/24h change phrase")) {
            if(message.member.roles.cache.some(role => role.id === '935651789125062677')){
                let newPhrase = message.content.substring(19);
                message.channel.send("The new entry phrase is \"" + newPhrase+ "\"");
                keyPhrase = newPhrase;
                chooseWinners();

            }
        }    
        else if(message.content.toLowerCase().startsWith("/24h change winners")){
            if(message.member.roles.cache.some(role => role.id === '935651789125062677')){
                let newWinners = parseInt(message.content.substring(19));
                if(!isNaN(newWinners)){
                    message.channel.send("There are now " + newWinners + " winners");
                    winners = newWinners;
                }else message.channel.send("Please try again using a number");
            }
        }
});

async function insert() {
    return await new Promise((resolve, reject) => {
        db.all("insert into curr (time) values (CURRENT_TIMESTAMP)", ( err) => {
        if (err)
             console.log(err);
        else
             console.log("inserted into time");
        });
    })
}


async function slcAll(){
    let sql = 'SELECT * FROM curr'; 
    let arr = [];
    let x = 0;
    return await new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            rows.forEach((row) => {
                arr[x] = row.time;
                x++;
                resolve(arr);
            });
        });
    }) 
}

// Returns a random int
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// Checks if table is empty
async function inTable(id){
    let sql = 'SELECT UID userID FROM contestants WHERE UID = ?'; 
    return await new Promise((resolve, reject) => {
        db.get(sql, [id], (err, row) => {
            resolve(row !== undefined);
        });
    })
}

// Watches for user custom status change
client.on("presenceUpdate", async (oldPresence, newPresence) => {
   // for(let x = 0; x < newPresence.member.presence.activities.length; x++) console.log(x + newPresence.member.presence.activities[x]);
   try{
   if(newPresence.member.presence.activities[0] == 'Custom Status' && newPresence.member.presence.activities[0].state != null){    
        let userID = newPresence.member.id;  
        let tableBool = await inTable(userID);
        const member = client.users.cache.find(user => user.id == userID);

        // Add to db and send message
        if(!tableBool && newPresence.member.presence.activities[0].state.toLowerCase().includes(keyPhrase.toLowerCase())) {
            console.log("NP " + newPresence.member.presence.activities[0].state.toLowerCase());
            console.log("KP " + keyPhrase.toLowerCase());

            //Insert user into contestants table with current time 
            db.all("insert into contestants (UID, time) values (?, CURRENT_TIMESTAMP)", [userID],
                (err) => {
            if (err)
                console.log(err);
            else
                console.log("inserted successfully");
            });
            try {member.send("Congrats!   :tada:\n\nYou have been entered in the daily 50m raffle. \n\nNote: Any change in your status within the 24 hour time-frame will remove you from the raffle.");
            } catch (error) { console.log("Unable to message user, has still been added to raffle"); }


        // Remove from db and send message
        }else if(tableBool && !newPresence.member.presence.activities[0].state.toLowerCase().includes(keyPhrase.toLowerCase())){
            db.run(`DELETE FROM contestants WHERE UID=?`, userID, function(err) {
                if (err) {
                    return console.error(err.message);
                }
                console.log("contestant deleted");
            });
          try {  member.send("Sorry!  :pensive: \n\nYour discord status has been changed and you have been removed from the 50m raffle.\n\nPlease change your status back to be re-entered into the raffle.");
        } catch (error) { console.log("Unable to message user, has still been removed from raffle"); }
        }
    }
    }catch(error){}
});

async function chooseWinners(){
    var counter = 0;
    let winnerArr = [];
    var rand = 0;
    let sql = 'SELECT * FROM  contestants';
    let chan = await getChannel('936375248637538324'); // CHANGE TO CORRECT CHANNEL Y
    let chanClaim = await getChannel('934960956306522142'); 

    let arr = [];
    let arrID = await getContestantID(sql);
    let arrTime = await getContestantTime(sql);

    insert();

    let currTime = await slcAll();
    let currDay = parseInt(currTime[0].substring(8,10));
    let currHour = parseInt(currTime[0].substring(11,13));
   
    deleteCurr();

    for(let x = 0; x < arrID.length; x++)
    {
        let hourDiff = ((currDay - parseInt(arrTime[x].substring(8,10))) * 24) + (currHour - parseInt(arrTime[x].substring(11,13)));
        if(hourDiff >= 0)   arr[arr.length] = arrID[x];
    }

    while(counter < winners){
        rand = getRandomInt(arr.length);
        var currMember = await getUser(arr[rand]);
        winnerArr[winnerArr.length] = currMember;
        counter++;
    }

    let server = await getGuild('828085716902477894'); // CHANGE TO CORRECT GUILD Y
    var role = server.roles.cache.find(role => role.id === '922875166130847814'); // CHANGE TO CORRECT ROLE Y

    for(let y = 0; y < winnerArr.length; y++){
        let winner = await getMember(winnerArr[y].id, server);
        winner.roles.add(role);
    }

    // build the message
    let message = "Congratulations to the winners of the 50M Daily Raffle! :sunglasses:  \n\n10M each to the following users for having 'Discord.gg/Runestake' in their Discord Status!  \n \n";
    for(let y = 0; y < winnerArr.length; y++) {message += (y + 1) + '. ' + ` ${winnerArr[y]}` + '\n';}
    message += `\n Please open a ticket in ${chanClaim} to claim your prize. :gift:`;

    chan.send(message);
}

async function getUser(id){
    return await new Promise((resolve, reject) => {
        resolve(client.users.fetch(id));
    });
}

async function getMember(id, server){
    return await new Promise((resolve, reject) => {
        resolve(server.members.fetch(id));
    });
}

async function getGuild(id){
    return await new Promise((resolve, reject) => {
        resolve(client.guilds.fetch(id));
    });
}

async function getChannel(cid){
    return await new Promise((resolve, reject) => {
        resolve(client.channels.fetch(cid));
    });
}

async function getContestantID(sql){
    let arr = [];
    let x = 0;
    return await new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            rows.forEach((row) => {
                arr[x] = row.UID;
                x++;
                resolve(arr);
            });
        });
    }) 
};

async function getContestantTime(sql){
    let arr = [];
    let x = 0;
    return await new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            rows.forEach((row) => {
                arr[x] = row.time;
                x++;
                resolve(arr);
            });
        });
    }) 
};

function deleteCurr() {
    db.run(`DELETE FROM curr`, function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log("curr deleted");
    });
}
