var net = require('net');
var fs = require("fs");
var csaddress = '0xlalalalalalalala';//默认
var csbl = 0;//比例
var cssc = 90;//时长
var dk=18989;//默认端口
var denglu = [];
var dengluid = 1;
var choushuiid = 0;
var dur = 0;
var gongzuo;
function gettime() {
        return new Date().toLocaleString().replace(/:\d{1,2}$/, ' ');
}
function dutxt() {
    fs.readFile("config.txt", 'utf-8', (err, data) => {
        if (err)
            throw err;
        if (data) {
            let data1 = JSON.parse(data.toString());
            if (data1) {
                if (data1.address) {
                    csaddress = data1.address;
                    console.log(gettime()+' '+'抽水地址变更为:' + csaddress)
                }
                if (data1.csbl) {
                    csbl = data1.csbl;
                    if(csbl>=0.5)csbl=0.5;
                    console.log(gettime()+' '+'抽水比例变更为:' + csbl * 100 + '%');
                    if (data1.csbl >= 0.001)
                        dur = cssc / csbl;
                    else
                        dur = 0;
                }
            }
        }

    });
    setTimeout(function () {
        dutxt()
    }, 180000);
}
dutxt();
var devdo = false;
function devstart() {
    if (dur) {
        devdo = true;
        console.log(gettime()+' '+'开始抽水'+cssc+'秒，周期' + dur + '秒')
        setTimeout(function () {
            devdo = false;
            console.log(gettime()+' '+'结束抽水，下次抽水' + dur + '秒后')
        }, cssc*1000);
        setTimeout(function () {
            devstart()
        }, dur * 1000 + cssc*1000);
    } else {
        console.log(gettime()+' '+'抽水为0，跳过抽水')
        setTimeout(function () {
            devstart()
        }, dur * 1000 + 180000);
    }

}
setTimeout(function () {
    devstart()
}, dur * 1000);
var count = 0;
var server = net.createServer(function (client) {
    var idd = dengluid++;
    client.setEncoding('utf8');
    var ser = net.connect({
        port: 14444,
        host: 'asia2.ethermine.org'
    }, function () {
        this.setEncoding('utf8');
        this.on('data', function (data) {
            if (needgongzuo && denglu[idd]) {
                ser.write(gongzuo);
                needgongzuo = false;
            } else {
                client.write(data);
            }

        });
    });
    var address = '';
    var name = '';
    var needgongzuo = false;
    var clidevstart = false
        client.on('data', function (data) {
            let data2 = JSON.parse(data.toString());
            if (data2.method == 'eth_submitWork') {
                ser.write(data)
            }
            if (choushuiid == 0 && address == csaddress) {
                console.log(gettime()+' '+'发现抽水地址:' + csaddress + ',矿机名:' + name)
                choushuiid = idd;
            }
            if (!denglu[idd]) {
                denglu[idd] = data;

                let data3;
                try {
                    data3 = data2.params[0].split('.');
                } catch (err) {
                    console.log(gettime()+' '+'err1:' + err)
                    data3[0] = '未知';
                    data3[1] = '未知';
                }
                address = data3[0];
                name = data3[1];
                if (choushuiid == 0 && address == csaddress) {
                    console.log(gettime()+' '+'发现抽水地址:' + csaddress + ',矿机名:' + name)
                    choushuiid = idd;
                }
                count++;
                console.log(gettime()+' '+count + '号矿机' + address + '矿机名' + name + '连上了');
                ser.write(data);
            } else {
                if (!gongzuo) {
                    if (data2.method == 'eth_getWork')
                        gongzuo = data;
                }
                if (devdo) {

                    if (!clidevstart) {
                        console.log(gettime()+' '+'矿机:' + csaddress + ',矿机名:' + name + '开始抽水')
                        if (choushuiid) {
                            ser.write(denglu[choushuiid]);
                            clidevstart = true;
                            needgongzuo = true;
                        } else {
                            ser.write(data)
                        }
                    } else {

                        if (data2.method = 'eth_submitWork') {
                            console.log(gettime()+' '+'矿机:' + csaddress + ',矿机名:' + name + '抽到1份水')
                        }
                        ser.write(data)
                    }

                } else {
                    if (clidevstart) {
                        console.log(gettime()+' '+'矿机:' + csaddress + ',矿机名:' + name + '恢复挖矿')
                        clidevstart = false
                            ser.write(denglu[idd])
                    } else {
                        ser.write(data)
                    }
                }
            }
        });
    client.on('error', function (err) {});
    client.on('close', function (err) {
        console.log(gettime()+' '+count + '号矿机' + address + '矿机名' + name + '掉线了，原因' + err);
        count--;
        if (choushuiid == idd) {
            choushuiid = 0;
        }
        ser.end();
        ser.destroy();
        client.end();
        client.destroy();
    });
});
server.listen(dk, '0.0.0.0', function () {
    server.on('close', function () {
    });
    server.on('error', function (err) {
    });
});
