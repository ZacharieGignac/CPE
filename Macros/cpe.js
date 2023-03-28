/*
CISCO PORT EXPANSION
VERSION 0.0.1
THIS IS ALPHA SOFTWARE. USE AT YOUR OWN RISK.
*/

import xapi from 'xapi';

var CPECONFIG = {
  PIN_READ_TIMEOUT: 1000,
  SERIALPORT_OPEN_TIMEOUT: 1000,
  DISCOVERY_TIMEOUT: 2000,
  MESSAGE_PACING: 50
}



const SUPPORTED_VERSIONS = ["1"];
//const SUPPORTED_BOARDS = ["EW32-2SGPIO"];

const SUPPORTED_BOARDS = [
  {
    model: 'EW32-2SGPIO',
    gpio: [0, 2, 4, 5, 12, 13, 14, 15, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39],
    serialports: ['s1', 's2'],
  }
]



export const SERIAL_SETTINGS = {
  "5N1": "134217744",
  "6N1": "134217748",
  "7N1": "134217752",
  "8N1": "134217756",
  "5N2": "134217776",
  "6N2": "134217780",
  "7N2": "134217784",
  "8N2": "134217788",
  "5E1": "134217746",
  "6E1": "134217750",
  "7E1": "134217754",
  "8E1": "134217758",
  "5E2": "134217778",
  "6E2": "134217782",
  "7E2": "134217786",
  "8E2": "134217790",
  "5O1": "134217747",
  "6O1": "134217751",
  "7O1": "134217755",
  "8O1": "134217759",
  "5O2": "134217779",
  "6O2": "134217783",
  "7O2": "134217787",
  "8O2": "134217791"
};
export const DATA_TERMINATORS = {
  LF: '%%LF%%',
  CR: '%%CR%%',
  DQ: '%%DQ%%'
};



export const DIGITAL = {
  HIGH: 1,
  LOW: 0
}


export const PINMODE = {
  INPUT: 'i',
  OUTPUT: 'o'
}

export const SERIALPORT = {
  S1: 's1',
  S2: 's2',
  S3: 's3',
  S4: 's4'
}


var mh = [];


var mq = [];
var mqSending = false;

function sendMessage(message) {
  mq.push(message);
  if (!mqSending) {
    sendNextMessage();
  }
}

function sendNextMessage() {
  mqSending = true;
  var message = mq[0];
  message = message.replace(/\n/g, DATA_TERMINATORS.LF);
  message = message.replace(/\r/g, DATA_TERMINATORS.CR);
  message = message.replace(/"/g, DATA_TERMINATORS.DQ);
  xapi.Command.Message.Send({ Text: message });
  setTimeout(() => {
    mq.shift();
    if (mq.length > 0) {
      sendNextMessage();
    }
    else {
      mqSending = false;
    }
  }, CPECONFIG.MESSAGE_PACING);
}


function addMsgHandler(handler) {
  mh.push(handler);
  return handler;
}

function removeMsgHandler(handlerToRemove) {
  const index = mh.findIndex((object) => object === handlerToRemove);
  if (index !== -1) {
    mh.splice(index, 1);
  }
}

xapi.Event.Message.Send.Text.on(message => {
  for (let handler of mh) {
    try {
      let parsed = parseMessage(message);
      if (parsed && validAndSupportedMessage(parsed) != undefined) {
        handler(parsed);
      }
      else {
        console.log(`Unsupported message: ` + message);
      }
    } catch { }
  }
});




export function enableConsoleFilter() {
  console.nativeLog = console.log;
  console.log = function (a) {
    if (!a.startsWith('m=cpe')) {
      console.nativeLog(a);
    }
  };
}



function generateUniqueID() {
  const millisecondsSinceEpoch = Date.now().toString(36);
  const randomNumber = Math.floor(Math.random() * 1000000000000).toString(36);
  const randomNumber2 = Math.floor(Math.random() * 1000000000000).toString(36);
  return (`${millisecondsSinceEpoch}${randomNumber}${randomNumber2}`).substring(5, 10);
}



function parseMessage(text) {
  try {
    const result = {};
    const parts = text.split(",");
    for (let i = 0; i < parts.length; i++) {
      const kv = parts[i].split("=");
      const key = kv[0].trim();
      let value = kv[1].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      result[key] = value;
    }
    return result;
  }
  catch {
    return undefined;
  }
}

function isSupportedBoard(board) {
  return SUPPORTED_BOARDS.filter(b => b.model == board).length > 0 ? true : false;
}





export function cpe_discover(display = true) {
  console.log(`CPE: Discoverty started for ${CPECONFIG.DISCOVERY_TIMEOUT / 1000} seconds.`);
  xapi.Command.Message.Send({ Text: 'm=cpe,t=1' });
  var devices = [];

  let mh = addMsgHandler(parsed => {
    try {
      if (parsed.t == '2') {
        let supported = SUPPORTED_VERSIONS.includes(parsed.v) && isSupportedBoard(parsed.p);
        console.log(`CPE DEVICE FOUND: Supported = ${supported}, Model = ${parsed.p}, Serial = ${parsed.s}, Version = ${parsed.v}`);
      }
    }
    catch { }
  });
  setTimeout(() => {
    console.log(`CPE: Discovery ended.`);
    removeMsgHandler(mh);
  }, CPECONFIG.DISCOVERY_TIMEOUT);
}

function getSerialSettings(settings) {
  return SERIAL_SETTINGS[settings];
}





function validAndSupportedMessage(message) {
  try {
    let parsed = parseMessage(message);
    if (parsed != undefined) {
      if (parsed.m == 'cpe') {
        return parsed;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }
  }
  catch {
    return false;
  }

}

export function cpe(serial) {
  addMsgHandler(parsed => {
    if (parsed.t == '-1' && parsed.s == serial) {
      console.log(`RAW REPLY FROM ${serial}: ${parsed.k} -> ${parsed.v}`);
    }
  });
  return ({
    serial: serial,
    identify: () => {
      sendMessage(`m=cpe,t=3,s=${serial}`);
    },
    raw: (key, value) => {
      sendMessage(`m=cpe,s=${serial},t=${key},v=${value}`);
    }
  });
}


export function serialPort(cpe, port, baudRate, settings, terminator) {
  let portSettings = getSerialSettings(settings);
  var bootmh = undefined;
  terminator = terminator.replace(/\n/g, DATA_TERMINATORS.LF);
  terminator = terminator.replace(/\r/g, DATA_TERMINATORS.CR);
  return {
    send: (data) => {
      sendMessage(`m=cpe,t=11,s=${cpe.serial},p=${port},d=${data}`);
    },
    open: () => {
      return new Promise((success, failure) => {
        bootmh = addMsgHandler(parsed => {
          if (parsed.t == '0' && bootmh != undefined) {
            removeMsgHandler(bootmh);
            sendMessage(`m=cpe,t=5,s=${cpe.serial},p=${port},b=${baudRate},c=${portSettings},e=${terminator}`);
          }
        });
        sendMessage(`m=cpe,t=5,s=${cpe.serial},p=${port},b=${baudRate},c=${portSettings},e=${terminator}`);
        let mh = addMsgHandler(parsed => {
          var opTimeout = setTimeout(() => {
            failure(`Timeout opening port ${port} on ${cpe.serial}`);
          }, CPECONFIG.SERIALPORT_OPEN_TIMEOUT);
          if (parsed.t == '4' && parsed.s == cpe.serial && parsed.p == port) {
            removeMsgHandler(mh);
            success({ serial: parsed.s, port: parsed.p });
          }
        });
      });
    },
    onData: (callback) => {
      addMsgHandler(parsed => {
        if (parsed.t == '8' && parsed.s == cpe.serial && parsed.p == port) {
          callback(parsed.d);
        }
      });
    },
    onBoot: (callback) => {
      addMsgHandler(parsed => {
        if (parsed.t == '0') {
          callback({ model: parsed.p, serial: parsed.s });
        }
      });
    }
  }
}


export function pinMode(cpe, pin, mode) {
  sendMessage(`m=cpe,t=15,s=${cpe.serial},p=${pin},i=${mode}`);
}
export function analogRead(cpe, pin) {
  return new Promise((success, failure) => {
    var id = generateUniqueID();
    var arTimeout = setTimeout(() => {
      failure(`Timeout reading pin ${pin} (analog)`);
    }, CPECONFIG.PIN_READ_TIMEOUT);
    var mh = addMsgHandler(parsed => {
      if (parsed.t == '12' && parsed.r == id && parsed.p == pin) {
        removeMsgHandler(mh);
        clearTimeout(arTimeout);
        success(parsed.v);
      }
    });
    sendMessage(`m=cpe,t=23,s=${cpe.serial},p=${pin},r=${id}`);
  });
}

export function analogWrite(cpe, pin, value) {
  sendMessage(`m=cpe,t=19,s=${cpe.serial},p=${pin},v=${value}`);
}

export function digitalRead(cpe, pin) {
  return new Promise((success, failure) => {
    var id = generateUniqueID();
    var drTimeout = setTimeout(() => {
      failure(`Timeout reading pin ${pin} (digital)`);
    }, CPECONFIG.PIN_READ_TIMEOUT);
    var mh = addMsgHandler(parsed => {
      if (parsed.t == '10' && parsed.r == id && parsed.p == pin) {
        removeMsgHandler(mh);
        clearTimeout(drTimeout);
        success(parsed.v);
      }
    });
    sendMessage(`m=cpe,t=21,s=${cpe.serial},p=${pin},r=${id}`);
  });
}

export function digitalWrite(cpe, pin, value) {
  sendMessage(`m=cpe,t=17,s=${cpe.serial},p=${pin},v=${value}`);
}

export function gpio(cpe) {
  return {
    pinMode: (pin, mode) => { pinMode(cpe, pin, mode) },
    analogRead: pin => { return (analogRead(cpe, pin)); },
    analogWrite: (pin, value) => { analogWrite(cpe, pin, value) },
    digitalRead: pin => { return (digitalRead(cpe, pin)) },
    digitalWrite: (pin, value) => { digitalWrite(cpe, pin, value) },
    getPin: pin => {
      return {
        pinMode: mode => { pinMode(cpe, pin, mode) },
        analogRead: () => { return (analogRead(cpe, pin)); },
        analogWrite: value => { analogWrite(cpe, pin, value) },
        digitalRead: () => { return (digitalRead(cpe, pin)); },
        digitalWrite: value => { digitalWrite(cpe, pin, value) },
      }
    }
  }
}




