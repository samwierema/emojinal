// Initialize the Slack module
var Slack = require('slack-node');
var s = new Slack(process.env.SLACK_API_TOKEN);

// Initialize the Cloudant module
var Cloudant = require('cloudant');
var c = Cloudant({
    account: process.env.CLOUDANT_ACCOUNT,
    username: process.env.CLOUDANT_USERNAME,
    password: process.env.CLOUDANT_PASSWORD
});
var db = c.db.use(process.env.CLOUDANT_DATABASE);

// Pick your own emojis!
var negative_emojis = ['-1', 'hankey', 'disappointed'];
var positive_emojis = ['+1', 'smile', 'ok_hand', 'sharkdance'];

// Kick a user from a channel
function kickUser(channel, user) {
    // Are we kicking from a group or a channel
    var endpoint = channel.substr(0, 1) === 'G' ? 'groups' : 'channels';
    s.api(endpoint + '.kick', {
        channel: channel,
        user: user
    }, function (err, response) {
        // Do something!
        console.log(err, response);
    })
}

// Pin a message to the channel
function pinMessage(channel, timestamp) {
    s.api('pins.add', {
        channel: channel,
        timestamp: timestamp
    }, function (err, response) {
        console.log(err);
        console.log(response)
    })
}

// Parse incoming stream data and do stuff!
function parseData(data, flags) {
    data = JSON.parse(data);

    // We don't want no non-emoji reaction things
    if (data.type !== 'reaction_added' && data.type !== 'reaction_removed') {
        return;
    }

    // First, we need to get the most recent list of emoji reactions
    // Restrict to the user that made the response.
    s.api('reactions.list', {
        user: data.user
    }, function (err, response) {
        if (err || response.ok !== true) {
            return;
        }
        mensagens = [];
        response.items.forEach(function (r, i, ri) {
            // Only process messages, since puns are mostly messages
            if (r.type !== 'message') {
                return false;
            }

            // If a message that's being reacted to is older than 10 minutes, don't process
            if (((Math.floor(Date.now() / 1000)) - r.message.ts.split('.')[0]) >= (10 * 60)) {
                return false;
            }

            // Create a hash that we can check for duplication
            // Turns out: Slack's API uses a message timestamp as a unique identifier
            var hash = r.channel + r.message.user + r.message.ts;

            // Don't process the same message twice
            if (mensagens.indexOf(hash) >= 0) {
                return false;
            }
            mensagens.push(hash);

            // Check if we've already taken an action on this particular message in Cloudant
            db.get(hash, function (err, response) {
                if (!err) {
                    return;
                }

                // Set a threshold
                var threshold = 0;

                // Loop through each message's emoji reactions and update the threshold accordingly
                r.message.reactions.forEach(function (re, ii, mr) {
                    if (negative_emojis.indexOf(re.name) >= 0) {
                        threshold = threshold - re.users.length;
                    }
                    if (positive_emojis.indexOf(re.name) >= 0) {
                        threshold = threshold + re.users.length;
                    }
                });

                // Lower threshold reached: kick the user out of the channel
                if (threshold <= -7) {
                    kickUser(r.channel, r.message.user);
                    db.insert({
                        date: (new Date).toString()
                    }, hash);
                }

                // Upper threshold reached: pin the message to the channel
                if (threshold >= 7) {
                    pinMessage(r.channel, r.message.ts);
                    db.insert({
                        date: (new Date).toString()
                    }, hash);
                }
            })
        });
    })
}

// Call the Real Time Messaging API start method, and start a websocket connection
s.api('rtm.start', function (err, response) {
    if (err) {
        return;
    }

    var WebSocket = require('ws');
    var ws = new WebSocket(response.url);

    ws.on('message', parseData);
});
