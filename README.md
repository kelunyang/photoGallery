JavaScript 輪播相簿&相框製作機
=====================

設計目的&使用場景
---------------
1. 想要播放自己的相片，還想跨裝置撥放
1. 想要製作自己的相框，讓用戶跟你的相框合照，並錄音

運行環境
-------
1. 客戶端：一台可以連上網的舊平板、舊手機，有瀏覽器即可（Firefox、Chrome為佳），如果要拍照必須安裝好Webcam
1. Server端：node.js 務必在8以上，支援async/await
1. 程式的自動Email通知用戶功能請先自己設定apikey，放置在apikey.json，內容格式如下
    `{
    "typekit": "",
    "mysql": {
		"host": "",
		"user": "",
		"password": "",
		"dbname": ""
	},
	"mail": {
		"service": "",
		"user": "",
		"pass": "",
		"sender": ""
	}
}`

功能
----
1. 顯示設定好的相簿，並不斷輪播
1. 提供用戶和你設定好的相框合照，並且留言
1. 隨機撥放相簿（可以分開用戶照片和主相簿）

Database Schema
---------------
1. 本來要使用sqlite，但node.js 8的sqlite driver有bug，先改用mysql，mysql帳號密碼請在apikey中設定
1. photo
    1. id(int) id primary key
    1. filename(text)
    1. event(int) foreign key to eventlist\id
    1. recExt(text)
    1. caption(text)
    1. hasRecording(tiny int)
    1. email(text)
    1. captureDate(int)
    1. captureLocation(text)
    1. type(tiny int)
1. eventlist
    1. id(int) primary key
    1. name(text)
    1. mainPhotoDir(text)

TODO List
---------
1. 後台管理（用戶管理），目前尚未實作

備註
----
1. 要使用Webcam和錄音機，必須使用HTTPS，SSL簽證請務必自行準備
1. 預設字型是Adobe的Noto黑體，請到Adobe的typekit自行取得API Key

開發者&授權
----------
Kelunyang (kelunyang@outlook.com) @ 2017 CC-BY