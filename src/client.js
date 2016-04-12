const NEWLINE = '\n';
var Conch = {};
var sock = io('localhost:8432')

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

Conch._storeUserId = function(id){
  localStorage['conch_uuid'] = id
}

Conch._getUserId = function(){
  return localStorage['conch_uuid'];
}

Conch.User = function(){

  var existingId = Conch._getUserId()

  if( !existingId ) {
    var uuid = Conch._uniqueId()
    Conch._storeUserId(uuid)
    return uuid
  } else {
    return existingId
  }

}

Conch._writeMessage = function( string ) {
  console.log(string)
}

Conch.say = function( string ){
  sock.emit('message', {
    body : string
  })
}

sock.emit('user connect', {
  uuid : Conch.User()
})

sock.on('message', function(data){
  Conch._writeMessage(data)
})

window.onbeforeunload = sock.emit('disconnect')
