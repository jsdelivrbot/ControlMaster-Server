var express = require('express');
var socket = require('socket.io');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://cmaster:HkT8tDVWvhTbC3NC@ds123926.mlab.com:23926/controlmaster-db";

//List of connections that are currently connected
var connections = [];

// App setup
var app  = express();
var server = app.listen((process.env.PORT || 5000),function(){
    console.log("Server UP ON PORT: "+ (process.env.PORT || 5000));
});

//Get all active connections
app.get('/connections', function (req, res) {
    res.send(connections);
});
//add new software support
app.get('/api/add/:soft/:play/:next/:back', function (req, res) {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var myobj = {"software":req.params.soft,"keys":[{"play":req.params.play},{"next":req.params.next},{"back":req.params.back}]};
        
        db.collection("keys").insertOne(myobj, function(err, res) {
          if (err) throw err;
          console.log("1 document inserted");
          //res.send("result: ok");
          db.close();
        });
    });
    res.send("ok");
});
app.get('/api/addkey/:soft/:keyname/:keyval', function (req, res) {
    res.send("ok");
});
//Get all active connections
app.get('/api/keys', function (req, res) {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        db.collection("keys").find({}).toArray(function(err, result) {
          if (err) throw err;
          res.send(result);
          db.close();
        });
    });
});

//Multi color support - exp
/*
app.get('/color/:r/:g/:b',function(req,res){
    var rgb = [req.params.r,req.params.g,req.params.b];
    for(var i = 0; i<rgb.length; i++)
        if(isNaN(rgb[i])) res.send('wrong parameters!'); return;
    var color = 'rgb('+req.params.r+','+req.params.g+','+req.params.b+')';
    res.send(color);
});
*/


// Static Routes
app.use(express.static('public'));

// Socket Setup
var io = socket(server);

io.on('connection',function(socket){
    //Start a new connection
    var connection = {connectionCode:getNewCode(),socketid:socket.id,c_socketid:0};
    //Add the connection to the list
    connections.push(connection);
    //Send the connection code back to the newly connected client
    socket.emit('concode',connection.connectionCode);
    //Logging the connection
    console.log("WS Connected - "+ JSON.stringify(connection));
    
    //Handling an action of button click on the phone
    socket.on('acmedia', function(data){
        if(connection.c_socketid!=0)
        socket.broadcast.to(connection.c_socketid).emit('acmedia',data);
    });
    var sComp = false;
    //The computer says im a computer and i have a code
    socket.on('im_comp',function(data){
        var con = getConnectionByCode(data);
        if(con!=null){
            removeConnectionByCode(connection.connectionCode);
            connection = con;
            connection.c_socketid= socket.id;
            socket.broadcast.to(connection.socketid).emit('con','connected');
            socket.emit('con','ok');
            sComp = true;
        }
        else{
            socket.emit('con','fail');
            console.log(data.toString() + " " + JSON.stringify(connections));
        }
    });

    //I already have a code
    socket.on("r-concode",function(data){
        connection.connectionCode = data.toString();
    });
    //Handle disconnect
    socket.on("disconnect",function(){
        if(sComp){
            socket.broadcast.to(connection.socketid).emit('con','disconnected');
        }
        else{
            socket.broadcast.to(connection.c_socketid).emit('con','disconnected');
            removeConnectionByCode(connection.connectionCode);
            console.log("con close -" + socket.id);
        }
    });

});

//Connections methods:
function getNewCode(){
    var connectionCode = getRandomInt(100000,1000000).toString();
    while(exsits(connectionCode)) 
         connectionCode = getRandomInt(100000,1000000).toString();
    return connectionCode;
}
function exsits(code){
    for(var i=0; i<connections.length;i++){
        if((connections[i].connectionCode.toString())==(code.toString()))
            return true;
    }
    return false;
}
function getConnectionByCode(code){
    console.log(code);
    for(var i=0; i<connections.length;i++){
        if((connections[i].connectionCode.toString())==(code.toString()))
            return connections[i];
    }
    return null;
}
function removeConnectionByCode(code){
    for(var i=0; i<connections.length;i++){
        if(connections[i].connectionCode==code)
        {
            connections.splice(i, 1);
        }
    }
}
//END

//Helpers:
//Random number generator
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
//END