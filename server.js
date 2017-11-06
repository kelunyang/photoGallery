//變數區，執行前必須指向node真正的安裝目錄
var globaldir = "C:\\Users\\Kelunyang\\AppData\\Roaming\\npm\\node_modules\\";
var https = require("https");
var url = require('url');
var mime = require('mime-types');
var stream = require('stream');

//外掛模組區，請確認執行前都已經用NPM安裝完成
var fs = require(globaldir+'fs-extra');
var klaw = require(globaldir+'klaw');
var through2 = require(globaldir+'through2');
var axios = require(globaldir+'axios');
var express = require(globaldir+"express");
var session = require(globaldir+"express-session");
var mysql = require(globaldir+"promise-mysql");
var moment = require(globaldir+"moment");
var io = require(globaldir+'socket.io');
var ios = require(globaldir+'express-socket.io-session');
var ss = require(globaldir+'socket.io-stream');
var MemoryStore = require(globaldir+'sessionstore');
var hbs = require(globaldir+'hbs');
var IcalExpander = require(globaldir+'ical-expander');
var Promise = require(globaldir+'bluebird');	//原生不錯，但bluebird有序列執行的功能
var compression = require(globaldir+'compression');
var JSZip = require(globaldir+'jszip');
var nodemailer = require(globaldir+'nodemailer');
/*var telegraf = require(globaldir+'telegraf');*/

//HTTPS
var SERVER_CONFIG = {
    key:  fs.readFileSync(__dirname+'/ssl/photoGallery.key'),
    cert: fs.readFileSync(__dirname+'/ssl/photoGallery.crt')
};
/*var chatbot = new telegraf();*/
/*var api = {
	telegram: undefined,
	airvisual: undefined
}*/

hbs.registerPartials(__dirname + '/views/partials');
var app = express();
app.set('view engine', 'hbs');
app.set('trust proxy', 1) // trust first proxy
var session_store = MemoryStore.createSessionStore();
var sessioninstance = session({
	secret: 'JJYV{(YJ<^',
	resave: true,
	saveUninitialized: true,
	store: session_store,
	cookie: {maxAge: 1800000}
})
var eventName = "";
var pool = null;
/*var server = http.Server(app);
server.listen(82, function() {
    console.log("voiceRecorder started!");
});*/
var api = {
	typekit: undefined,
	mysql: {
		host: undefined,
		user: undefined,
		password: undefined,
		dbname: undefined
	}
}
var server = https.createServer(SERVER_CONFIG, app).listen(83,function() {
	fs.readFile(__dirname+'/apikeys.json', (err, data) => {
		api = JSON.parse(data);
		pool = mysql.createPool({
			host: api.mysql.host,
			user: api.mysql.user,
			password: api.mysql.password,
			database: api.mysql.dbname,
			connectionLimit: 10
		});
		console.log("photoGallery starts in HTTPS mode!");
	});
	/*console.log("chatBot starting...");
	fs.readFile(__dirname+'/apikeys.json', (err, data) => {
		api = JSON.parse(data);
		chatbot.token = api.telegram;
		chatbot.startPolling();
		console.log("chatBot executed!");
	});*/
});
var serv_io = io(server);
serv_io.use(ios(sessioninstance, {
	autoSave: true
}));
serv_io.of("/fileUpload").use(ios(sessioninstance, {
	autoSave: true
}));
app.use(sessioninstance);
app.use(compression());
/*chatbot.command("start", (ctx) => {
	console.log("start", ctx.from);
	ctx.reply("Welcome!");
});
chatbot.hears("hi", (ctx) => {
	console.log("hi", ctx.from);
	ctx.reply("Hey there!")}
);*/

app.get("/", (req,res) => {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	console.log("Client Connected:"+ip+"("+moment().format("YYYY/MM/DD HH:mm:ss")+")");
	req.session.eventID = req.query.hasOwnProperty("eventID") ? req.query.eventID : 1;
	req.session.playType = req.query.hasOwnProperty("type") ? req.query.type : 0;
	req.session.save();
	pool.getConnection().then(function(connection) {
		connection.query("SELECT `name` FROM eventlist WHERE `id` = ?",req.session.eventID)
		.then(function(rows) {
			res.render("gallery", {
				title: rows[0].name,
				typekit: api.typekit
			});
		});
		pool.releaseConnection(connection);
	}).catch(function(err) {
		console.log(err);
	});
});
app.get("/capture", function(req,res) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	console.log("Client Connected:"+ip+"("+moment().format("YYYY/MM/DD HH:mm:ss")+")");
	req.session.eventID = req.query.hasOwnProperty("eventID") ? req.query.eventID : 1;
	req.session.save();
	pool.getConnection().then(function(connection) {
		connection.query("SELECT `name` FROM eventlist WHERE `id` = ?",req.session.eventID)
		.then(function(rows) {
			eventName = rows[0].name;
			res.render("capture", {
				title: rows[0].name,
				typekit: api.typekit
			});
		});
		pool.releaseConnection(connection);
	}).catch(function(err) {
		console.log(err);
	});
});
app.get("/edit", function(req,res) {
	req.session.eventID = req.query.hasOwnProperty("eventID") ? req.query.eventID : 1;
	req.session.save();
	pool.getConnection().then(function(connection) {
		connection.query("SELECT `name` FROM eventlist WHERE `id` = ?",req.session.eventID)
		.then(function(rows) {
			eventName = rows[0].name;
			res.render("edit", {
				title: rows[0].name,
				typekit: api.typekit
			});
		});
		pool.releaseConnection(connection);
	}).catch(function(err) {
		console.log(err);
	});
});
app.get("/userphotos", function(req, res) {
	req.session.eventID = req.query.hasOwnProperty("eventID") ? req.query.eventID : 1;
	req.session.save();
	pool.getConnection().then(function(connection) {
		connection.query("SELECT `mainPhotoDir` FROM eventlist WHERE `id` = ?",req.session.eventID)
		.then(function(rows) {
			var file = rows[0].mainPhotoDir + "\\" + req.query.name;
			res.download(file); // Set disposition and send it.
		});
		pool.releaseConnection(connection);
	}).catch(function(err) {
		console.log(err);
	});
});
app.get("/download", function(req, res) {
	req.session.eventID = req.query.hasOwnProperty("eventID") ? req.query.eventID : 1;
	req.session.save();
	var zip = new JSZip();
	pool.getConnection().then(function(connection) {
		connection.query("SELECT `id`, `filename`, `recExt` FROM photo WHERE `event` = ? AND `type` = 2",req.session.eventID)
		.then(function(rows) {
			rows.forEach(function(row) {
				zip.file(row.filename, fs.createReadStream(__dirname+"/uploads/"+row.filename));
				zip.file(row.id+"."+row.recExt, fs.createReadStream(__dirname+"/uploads/"+row.id+"."+row.recExt));
			});
		}).then(function() {
			res.attachment(eventName+'.zip');
			zip.generateNodeStream({streamFiles:true}).pipe(res);
		});
	}).catch(function(err) {
		console.log(err);
	});
});
app.get("/uploadphotos", function(req, res) {
	var file = __dirname + '/uploads/' + req.query.name;
	res.download(file); // Set disposition and send it.
});
app.get("/socket.io-stream.js", function(req, res) {
	var file = __dirname + '/javascript/socket.io-stream.js';
	res.download(file); // Set disposition and send it.
});

serv_io.of("/fileUpload").on("connection", (socket) => {
	var sessioni = socket.handshake.session;
	var ipaddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	ss(socket).on("photoUpload", (stream, data) => {
		pool.getConnection().then(async (connection) => {
			await connection.query("UPDATE `photo` SET `filename`= ?, `caption`= ?, `hasRecording` = ?, `email` = ? WHERE `id`=? ",[data.id+".png", data.caption, data.hasRecording, data.email, data.id])
		}).then(async() => {
			stream.pipe(fs.createWriteStream(__dirname+"/uploads/"+data.id+".png"));
			return streamToPromise(stream);
		}).then(async() => {
			var transporter = nodemailer.createTransport({
				service: api.mail.service,
				auth: {
					user: api.mail.user, // generated ethereal user
					pass: api.mail.pass  // generated ethereal password
				}
			});
			var mailOptions = {
				from: api.mail.sender, // sender address
				to: data.email, // list of receivers
				subject: "你在"+eventName+"的照片", // Subject line
				text: '附檔是你在'+eventName+"的照片，你的留言訊息是：「"+data.caption+"」", // plain text body
				html: '附檔是你在'+eventName+"的照片，你的留言訊息是：「"+data.caption+"」", // html body
				attachments: [
					{   // utf-8 string as an attachment
						filename: '合照.png',
						path: __dirname+"/uploads/"+data.id+".png"
					}
				]
			};
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					return console.log(error);
				}
				serv_io.emit('newPhoto');
				ss(socket).emit("photoSaved", data.id);
			});
		}).catch(function(err) {
			console.log(err);
			socket.emit("errorMsg", function() {
				msg: e
			});
		});
	});
	ss(socket).on("recUpload", (stream, data) => {
		pool.getConnection().then(async (connection) => {
			await connection.query("UPDATE `photo` SET `recExt`= ? WHERE `id`=? ",[data.filetype, data.id])
		}).then(async() => {
			stream.pipe(fs.createWriteStream(__dirname+"/uploads/"+data.id+"."+data.filetype));	//fs.createWriteStream opintion default set to override
			return streamToPromise(stream);
		}).then(async() => {
			var transporter = nodemailer.createTransport({
				service: api.mail.service,
				auth: {
					user: api.mail.user, // generated ethereal user
					pass: api.mail.pass  // generated ethereal password
				}
			});
			var mailOptions = {
				from: api.mail.sender, // sender address
				to: data.email, // list of receivers
				subject: "你在"+eventName+"的錄音", // Subject line
				text: '附檔是你在'+eventName+"的錄音", // plain text body
				html: '附檔是你在'+eventName+"的錄音", // html body
				attachments: [
					{
						filename: '錄音.'+data.filetype,
						path: __dirname+"/uploads/"+data.id+"."+data.filetype
					}
				]
			};
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					return console.log(error);
				}
				ss(socket).emit("recSaved", true);
			});
		});
	});
});
serv_io.sockets.on('connection', async (socket) => {
	/*var address = socket.request.connection.remoteAddress;
	console.log('socket connected from ' + address);*/
	var sessioni = socket.handshake.session;
	socket.on("userCheck", function(data) {
		if(sessioni.hasOwnProperty("eventID")) {
			socket.emit("userChecked", true);
		} else {
			socket.emit("userChecked", false);
		}
	});
	socket.on("getPhotoList", function(data) {
		var mainDir = null;
		var photolist = new Array();
		var eventID = data == undefined ? sessioni.eventID : data.eventID;
		pool.getConnection().then(function(connection) {
			var queryStr = "SELECT `caption`, `filename`, `captureDate`, `captureLocation`, `type`, `email` FROM photo WHERE `event` = ? AND ";
			queryStr += sessioni.playType == 0 ? "`type` <> 1" : "`type` = 2"
			connection.query(queryStr,eventID)
			.then(function(rows) {
				rows.forEach(function(row) {
					photolist.push({
						caption: row.caption,
						filename: row.filename,
						type: row.type,
						email: row.email,
						captureDate: row.captureDate,
						captureLocation: row.captureLocation
					})
				});
				socket.emit("ListedPhoto", photolist);
			});;
		}).catch(function(err) {
			console.log(err);
		});
	});
	socket.on("getFrames", function(data) {
		var mainDir = null;
		var photolist = new Array();
		var eventID = data == undefined ? sessioni.eventID : data.eventID;
		pool.getConnection().then(function(connection) {
			connection.query("SELECT `filename` FROM photo WHERE `event` = ? AND `type` = 1",eventID)
			.then(function(rows) {
				rows.forEach(function(row) {
					photolist.push({
						filename: row.filename,
					})
				});
				socket.emit("frameList", photolist);
			});;
		}).catch(function(err) {
			console.log(err);
		});
	});
	socket.on("listPhoto", function(data) {
		if(sessioni.hasOwnProperty("eventID")) {
			pool.getConnection().then(function(connection) {
				connection.query("SELECT `mainPhotoDir` FROM eventlist WHERE `id` = ?",sessioni.eventID)
				.then(function(rows) {
					var excludeDirFilter = through2.obj(function (item, enc, next) {
					if (/\.(jpg|png|svg)/.test(item.path)) { this.push(item); }
					next();
					});
					var items = [] // files, directories, symlinks, etc 
					klaw(rows[0].mainPhotoDir)
					.pipe(excludeDirFilter)
					.on('data', item => items.push(item.path.match(/[^\\]*(png|jpg|svg)/)[0]))
					.on('end', () => socket.emit("Photolist", items));
				});
				pool.releaseConnection(connection);
			}).catch(function(err) {
				console.log(err);
			});
		} else {
			socket.emit("errorMsg", {
				err: "沒有指定活動編號！"
			})
		}
	});
	socket.on("getInfo", function(data) {
		pool.getConnection().then(function(connection) {
			var eventID = data == undefined ? sessioni.eventID : data.eventID;
			connection.query("SELECT `mainPhotoDir`, `name` FROM eventlist WHERE `id` = ?",eventID)
			.then(function(rows) {
				if(rows.length > 0) {
					socket.emit("eventInfo", {
						name: rows[0].name,
						mainDir: rows[0].mainPhotoDir
					});
				} else {
					socket.emit("errorMsg", {
						err: "沒有指定活動編號！"
					})
				}
			});
			pool.releaseConnection(connection);
		}).catch(function(err) {
			console.log(err);
		});
	});
	socket.on("queryuserImg", function(data) {
		pool.getConnection().then(function(connection) {
			var eventID = !data.hasOwnProperty("eventID") ? sessioni.eventID : data.eventID;
			connection.query("SELECT `caption`, `type`, `id`, `captureDate`, `captureLocation` FROM photo WHERE `event` = ? AND `filename` = ?",[eventID, data.filename])
			.then(function(rows) {
				var returnObj = new Object();
				returnObj.count = rows.length;
				returnObj.filename = data.filename;
				if(rows.length > 0) {
					returnObj.caption = rows[0].caption;
					returnObj.id = rows[0].id;
					returnObj.type = rows[0].type;
					returnObj.captureDate = rows[0].captureDate;
					returnObj.captureLocation = rows[0].captureLocation;
				}
				socket.emit("userimgInfo", returnObj);
			});
			pool.releaseConnection(connection);
		}).catch(function(err) {
			console.log(err);
		});
	});
	socket.on("insertUpload", function(data) {
		var random = Math.random()*1000+"test";
		var eventID = sessioni.eventID;
		captureDate = moment().unix();
		pool.getConnection().then(async (connection) => {
			await connection.query("INSERT INTO photo (`caption`, `event`, `filename`, `type`, `captureDate`, `captureLocation`) VALUES (?, ?, ?, ?, ?, ?)",["", eventID, random, 2, captureDate, ""]);
			return connection;
		}).then(async (connection) => {
			await connection.query("SELECT  `id` FROM photo WHERE `filename` = ? AND `type` = 2",random)
			.then(function(rows) {
				if(rows.length > 0) {
					socket.emit("uploadReady", {
						id: rows[0].id
					});
				}
			});
			pool.releaseConnection(connection);
		}).catch(function(err) {
			console.log(err);
		});
	});
	socket.on("saveCaption", function(data) {
		pool.getConnection().then(function(connection) {
			var eventID = !data.hasOwnProperty("eventID") ? sessioni.eventID : data.eventID;
			data.captureDate = data.captureDate == null ? 0 : data.captureDate;
			if(data.id == 0) {
				connection.query("INSERT INTO photo (`caption`, `event`, `filename`, `type`, `captureDate`, `captureLocation`) VALUES (?, ?, ?, ?, ?, ?)",[data.caption, eventID, data.filename, data.type, data.captureDate, data.captureLocation])
				.then(function(rows) {
					socket.emit("captionSaved", true);
				});
			} else {
				connection.query("UPDATE `photo` SET `caption`= ?, `captureDate` = ?, `captureLocation` = ?, `type` = ? WHERE `id`=? ",[data.caption, data.captureDate, data.captureLocation, data.type, data.id])
				.then(function(rows) {
					socket.emit("captionSaved", true);
				});
			}
			pool.releaseConnection(connection);
		}).catch(function(err) {
			console.log(err);
		});
	});
	socket.on("sendeventInfo", function(data) {
		pool.getConnection().then(function(connection) {
			var eventID = !data.hasOwnProperty("eventID") ? sessioni.eventID : data.eventID;
			connection.query("UPDATE `eventlist` SET `mainPhotoDir`= ? , `name` = ? WHERE `id`=? ",[data.location, data.name, eventID])
			.then(function(rows) {
				socket.emit("eventUpdated", true);
			});
			pool.releaseConnection(connection);
		}).catch(function(err) {
			console.log(err);
		});
	});
});
function streamToPromise(stream) {
    return new Promise(function(resolve, reject) {
        stream.on("end", resolve);
        stream.on("error", reject);
    });
}