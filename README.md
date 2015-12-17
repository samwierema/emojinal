# Emojinal 😊
Emojinal is an up- and downvoting system for Slack. Using emoji reactions the application will keep track of how many positive and negative responses have been given. If a threshold is reached the user is either removed, or the message is pinned to the channel. Built at [HackKing's](http://hackkings.org/).

## Features
* 👍Track positive and negative emoji reactions (you can choose your own!)
* 👍Kick a user, or pin a message, when a threshold has been reached 

## Installation
1. 💻 Download the source code 
2. ☁ ️Create an account on [Cloudant](https://cloudant.com/) and create a database 
3. 🔑 Get a Slack API token (get one [here](https://api.slack.com/web) or via an OAuth flow (needs the `client` scope`)) 
4. 🏃Run it: `npm index.js` 

## Author
* [Sam Wierema](http://wiere.ma)
