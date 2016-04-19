const NEWLINE_TOKEN = '\n'
const STYLE_TOKEN = '%c'
const INCOMING = '📥'
const OUTGOING = '📤'
const CONCH_LOGO = '🐚'

// const ENDPOINT = 'direct.doot0.co.uk:8432';
const ENDPOINT = 'localhost:8432';

const CONCH_STYLES = {
  'big'      : 'font-size: 1.1em; ',
  'feedback' : 'font-style: italic; ',
  'heavy'    : 'font-weight: bold; ',
  'bright'   : 'color: #999; ',
  'warning'  : 'color: red; '
}

const KEEPALIVE_INTERVAL = 2500;

var Conch = {}

var sock = io(ENDPOINT)

Conch._uniqueId = function(){
  var d = new Date().getTime()
  if(window.performance && typeof window.performance.now === "function"){
      d += performance.now()
  }
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0
      d = Math.floor(d/16)
      return (c=='x' ? r : (r&0x3|0x8)).toString(16)
  })
  return uuid
}

Conch._storeUserId = function( string ){
  localStorage['conch_uuid'] = string
}

Conch._storeUsername = function( string ) {
  localStorage['conch_username'] = string
}

Conch._getUserId = function(){
  return localStorage['conch_uuid']
}

Conch._getUsername = function() {
  return localStorage['conch_username']
}

/**
 * INTERNAL
 * Writes a message directly to console and styles it if appropriate
 * @param  {String} string The body of the message as a string
 * @param  {String} styles The styling for the message as CSS in a string
 */
Conch._writeMessage = function( string, styles ) {

  // @TODO allow passing of an object of strings/styles to pass
  // {
  //   message : {
  //     string : 'foo',
  //     style  : 'bar:baz;'
  //   }
  // }

  if( styles ) {
    console.log(STYLE_TOKEN + string, styles)
  } else {
    console.log(string)
  }
}

/**
 * Keepalive
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
Conch._keepAlive = function(){

  setInterval(function(){

    sock.emit('keepalive', {
      uuid: Conch._getUserId()
    })

  }, KEEPALIVE_INTERVAL);

}

/*
  Write some intro text to the console
 */
Conch._intro = function(){

  Conch._writeMessage(
    NEWLINE_TOKEN +
    '=================' +
    NEWLINE_TOKEN +
    ' Conch is ready.' +
    NEWLINE_TOKEN +
    '=================' +
    NEWLINE_TOKEN +
    NEWLINE_TOKEN +
    `Call "Conch.setUsername()" to set your username. When you've done that, you can use "Conch.say()" to send a message. Have fun!`
    ,CONCH_STYLES.heavy
  )

}

/**
 * Sets the clientside username and stores it
 * @param  {String} string The username
 * @return null
 */
Conch.setUsername = function( string ){

  var currentUsername = Conch._getUsername()
  Conch._storeUsername( string )

  if( string === undefined ) {
    Conch._writeMessage(
      "Enter at least one character.",
      CONCH_STYLES.heavy + CONCH_STYLES.bright
    )
    return;
  }

  sock.emit('user namechange', {
    old: currentUsername,
    new : string
  })

  Conch._writeMessage(
    'Your username is now "' + string + '."',
    CONCH_STYLES.heavy + CONCH_STYLES.bright
  )

}


/*
  Enables the use of convenient shortcuts by gallantly polluting global scope
 */
Conch.enableShortCommands = function() {

  Conch._writeMessage(
    NEWLINE_TOKEN
    + "You can now use say() in place of Conch.say(). Heads up - this pollutes window scope, but it'll go away on exit.",
    CONCH_STYLES.feedback + CONCH_STYLES.bright
  )

  window['say'] = Conch.say

}

Conch.getConnectedUsers = function() {
  sock.emit('request connected users')
}

/**
 * Returns the entire user object
 * OR
 * Returns the requested data from the user object
 *
 * @param  {String} info The requested key from the user object.
 * @return {Object}      The object containing all/any user data.
 */
Conch.User = function( info ){

  var existingId = Conch._getUserId()
  var existingName = Conch._getUsername()

  var _user = {}

  if( !existingId ){
    var uuid = Conch._uniqueId()
    Conch._storeUserId(uuid)
    _user['uuid'] = existingId
  } else {
    _user['uuid'] = existingId
  }

  if( existingName ) {
    var username = Conch._getUsername()
    Conch._storeUsername(username)
    _user['username'] = existingName
  } else {
    _user['username'] = existingName
  }

  if( info ) {
    return _user[info]
  } else {
    return _user
  }

}

/**
 * Emits a message to the server
 * @param  {String} string The message to send
 * @return null
 */
Conch.say = function( string ){
  sock.emit('message', {
    body : string,
    username : Conch._getUsername()
  })
}

/**
 * Bootstrapper
 */
Conch.init = function() {
  Conch._keepAlive()
  Conch._intro()
}

/*
  Emits the user object to the socket
 */
sock.emit('user connect', Conch.User())

/*
  Handles incoming messages from the socket and writes them to the console
 */
sock.on('message', function(data){

  if( !data.username ) {
    Conch._writeMessage(NEWLINE_TOKEN + 'Unknown: ' + data.body)
  } else {
    Conch._writeMessage(NEWLINE_TOKEN + data.username + ': ' + data.body)
  }

})

/*
  Handles user name change event
 */
sock.on('user namechange', function(data){
  Conch._writeMessage(
    data.old + " changed their name to " + data.new,
    CONCH_STYLES.heavy
  )
})

/*
  Handles user connect events
 */
sock.on('user connect', function(data){
  Conch._writeMessage(
    "'" + data.username + "' joined.",
    CONCH_STYLES.heavy
  )
})

/*
  Handles user disconnect events
 */
sock.on('user disconnect', function(data){

  // cleanup connected users
  sock.emit('user cleanup');

  Conch._writeMessage(
    "Somebody disconnected.",
    CONCH_STYLES.heavy
  )

})

sock.on('knock', function(){
  sock.emit('keepalive', Conch.User())
})

sock.on('connected users', function(data){

  var users = data.toString(),
      processedUsers = users.split(',').join(', ')
  var justMe = (data.length == 1)

  if(justMe) {
    Conch._writeMessage(
      "It's just you and me in here, bub.",
      CONCH_STYLES.bright
    )
  } else {
    Conch._writeMessage(
      "Users online: " + processedUsers,
      CONCH_STYLES.bright
    )
  }

})

/*
  Do the thing!
 */
Conch.init()
