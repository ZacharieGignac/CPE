/*

THIS IS ALPHA SOFTWARE. USE AT YOUR OWN RISK.
VERSION 0.0.1



 * 
 * [CODEC -> ESP32]

DEVICE_DISCOVER
m=cpe,t=1

DEVICE_IDENTIFY
m=cpe,t=3,s=<serial number>

OPEN SERIAL PORT
m=cpe,t=5,s=75B8,p=s1,b=9600,c=4763284,e=\n

CLOSE SERIAL PORT
m=cpe,t=7,s=75B8,p=s1

SET RELAY
m=cpe,t=9,p=r1,v=1/0

SEND SERIAL DATA
m=cpe,t=11,s=75B8,p=s1,d=data

SET LICENSE
m=cpe,t=13,s=75B8,l=123

SET PIN MODE
m=cpe,t=15,s=75B8,p=26,i=<i/o>

DIGITAL WRITE
m=cpe,t=17,s=75B8,p=26,v=<1,0>

ANALOG WRITE
m=cpe,t=19,s=75B8,p=26,v=<1...4423423>

DIGITAL READ
m=cpe,t=21,s=75B8,p=26,r=<request number>

ANALOG READ
m=cpe,t=23,s=75B8,p=26,r=5436758634


[ESP32 -> CODEC]

DEVICE_DISCOVER_REPLY
m=cpe,t=2,v=1,p=2S2R,s=75B8

SERIAL PORT OPEN
m=cpe,t=4,s=75B8,p=s1

SERIAL PORT CLOSE
m=cpe,t=6,s=75B8,p=s1

SERIAL PORT DATA
m=cpe,t=8,s=75B8,p=s1,d=data

DIGITAL READ REPLY
m=cpe,t=10,s=75B8,r=<request>,p=<pin>,v=<value>

ANALOG READ REPLY
m=cpe,t=12,s=75B8,r=<request>,p=<pin>,v=<value>

 * 
 * 
 */
#include <map>
#include <String>
#include <esp_system.h>
#include <HardwareSerial.h>


#define RUNNING_ON "codec"  //pc, codec
#define PROTOCOL_VERSION "1"
#define PRODUCT "EW32-2SGPIO"
#define S1RX 16
#define S1TX 17
#define S2RX 26
#define S2TX 27
#define MAX_DATA_LEN (1024)
#define TERMINATOR_CHAR ('\r')

HardwareSerial extSerial1(1);
HardwareSerial extSerial2(2);


int s1baud = 9600;
int s2baud = 9600;
String s1term = "%NEW_LINE%";
int s1config = SERIAL_8N1;
int s2config = SERIAL_8N1;
String s2term = "%NEW_LINE%";
int mainLoopDelay = 0;

bool licensed = false;

bool s1Opened = false;
bool s2Opened = false;

int ignoreMessages = 0;

String serialNumber;

String getSerialNumber() {
  uint8_t mac[6];
  esp_efuse_mac_get_default(mac);
  char serialNumber[13];
  snprintf(serialNumber, sizeof(serialNumber), "%02X%02X", mac[4], mac[5]);
  return serialNumber;
}



int getSerialConfig(String cfg) {
  std::map<String, uint32_t> portSettings;
  portSettings["5N1"] = SERIAL_5N1;
  portSettings["6N1"] = SERIAL_6N1;
  portSettings["7N1"] = SERIAL_7N1;
  portSettings["8N1"] = SERIAL_8N1;
  portSettings["5N2"] = SERIAL_5N2;
  portSettings["6N2"] = SERIAL_6N2;
  portSettings["7N2"] = SERIAL_7N2;
  portSettings["8N2"] = SERIAL_8N2;
  portSettings["5E1"] = SERIAL_5E1;
  portSettings["6E1"] = SERIAL_6E1;
  portSettings["7E1"] = SERIAL_7E1;
  portSettings["8E1"] = SERIAL_8E1;
  portSettings["5E2"] = SERIAL_5E2;
  portSettings["6E2"] = SERIAL_6E2;
  portSettings["7E2"] = SERIAL_7E2;
  portSettings["8E2"] = SERIAL_8E2;
  portSettings["5O1"] = SERIAL_5O1;
  portSettings["6O1"] = SERIAL_6O1;
  portSettings["7O1"] = SERIAL_7O1;
  portSettings["8O1"] = SERIAL_8O1;
  portSettings["5O2"] = SERIAL_5O2;
  portSettings["6O2"] = SERIAL_6O2;
  portSettings["7O2"] = SERIAL_7O2;
  portSettings["8O2"] = SERIAL_8O2;
  return portSettings[cfg];
}

String extractMessage(String str) {
  int firstQuoteIndex = str.indexOf("\"");
  int lastQuoteIndex = str.lastIndexOf("\"");
  if (firstQuoteIndex >= 0 && lastQuoteIndex >= 0) {
    return str.substring(firstQuoteIndex + 1, lastQuoteIndex);
  }
  return "";
}



std::map<String, String> parseString(String str) {
  std::map<String, String> dict;
  char* pch;
  char* rest = const_cast<char*>(str.c_str());
  while ((pch = strtok_r(rest, ",", &rest))) {
    String name = String(strtok_r(pch, "=", &pch));
    String value = String(pch);

    int quoteStart = value.indexOf("\"");
    int quoteEnd = value.lastIndexOf("\"");

    if (quoteStart >= 0 && quoteEnd >= 0) {
      value = value.substring(quoteStart + 1, quoteEnd);
    } else {
      value.trim();
    }

    dict[name] = value;
  }

  return dict;
}






void xapiMessage(String message) {
  ignoreMessages = 6;
  int bufferSize = snprintf(NULL, 0, "xcommand message send text:\"%s\"", message.c_str()) + 1;
  char* buffer = new char[bufferSize];
  snprintf(buffer, bufferSize, "xcommand message send text:\"%s\"", message.c_str());
  Serial.println(buffer);
  delete[] buffer;
}


void fastBlink() {
  digitalWrite(2, HIGH);
  delay(200);
  digitalWrite(2, LOW);
}

void send_discovery_reply() {
  char buffer[1024];
  sprintf(buffer, "m=cpe,t=2,v=%s,p=%s,s=%s", String(PROTOCOL_VERSION), PRODUCT, serialNumber);
  xapiMessage(buffer);
}


void identify() {
  for (int i = 0; i < 20; i++) {
    digitalWrite(2, HIGH);
    delay(200);
    digitalWrite(2, LOW);
    delay(200);
  }
}



void openS1(String baudrate, String settings, String term) {

  s1term = term;
  if (s1term == "%%CR%%") {
    s1term = String(char(13));
  } else if (s1term == "%%LF%%") {
    s1term = String(char(10));
  }

  if (s1Opened) {
    extSerial1.end();
  }

  extSerial1.begin(baudrate.toInt(), settings.toInt(), S1RX, S1TX);
  //extSerial1.begin(9600,SERIAL_8N1,S1RX,S1TX);

  s1Opened = true;
  xapiMessage("m=cpe,t=4,v=" + String(PROTOCOL_VERSION) + ",s=" + serialNumber + ",p=s1");
}

void openS2(String baudrate, String settings, String term) {
  s2term = term;
  if (s2term == "%%CR%%") {
    s2term = String(char(13));
  } else if (s2term == "%%LF%%") {
    s2term = String(char(10));
  }

  if (s2Opened) {
    extSerial2.end();
  }

  extSerial2.begin(baudrate.toInt(), settings.toInt(), S2RX, S2TX);
  xapiMessage("m=cpe,t=4,v=" + String(PROTOCOL_VERSION) + ",s=" + serialNumber + ",p=s2");
  s2Opened = true;
}

void dataReceived(String port, String data) {
  data.replace("\n", "%%LF%%");
  data.replace("\r", "%%CR%%");
  xapiMessage("m=cpe,t=8,v=" + String(PROTOCOL_VERSION) + ",s=" + serialNumber + ",p=" + port + ",d=" + data);
}

void sendS1(String data) {
  data.replace("%%LF%%", "\n");
  data.replace("%%CR%%", "\r");
  extSerial1.print(data);
}
void sendS2(String data) {
  data.replace("%%LF%%", "\n");
  data.replace("%%CR%%", "\r");
  extSerial2.print(data);
}

void configurePin(String sPin, String sMode) {
  int pin = sPin.toInt();
  if (sMode == "i") {
    pinMode(pin, INPUT);
  } else if (sMode == "o") {
    pinMode(pin, OUTPUT);
  }
}

void pinDigitalWrite(String sPin, String sValue) {
  int pin = sPin.toInt();
  if (sValue == "1") {
    digitalWrite(pin, HIGH);
  } else if (sValue == "0") {
    digitalWrite(pin, LOW);
  }
}
void pinAnalogWrite(String sPin, String sValue) {
  int pin = sPin.toInt();
  analogWrite(pin, sValue.toInt());
}

void pinDigitalRead(String sPin, String request) {
  int val = digitalRead(sPin.toInt());
  xapiMessage("m=cpe,t=10,s=" + serialNumber + ",r=" + request + ",p=" + sPin + ",v=" + String(val));
}

void pinAnalogRead(String sPin, String request) {
  int val = analogRead(sPin.toInt());
  xapiMessage("m=cpe,t=12,s=" + serialNumber + ",r=" + request + ",p=" + sPin + ",v=" + String(val));
}



void setup() {
  serialNumber = getSerialNumber();

  Serial.begin(115200);
  pinMode(2, OUTPUT);
  digitalWrite(2, HIGH);
  delay(300);
  digitalWrite(2, LOW);
  delay(300);
  digitalWrite(2, HIGH);
  delay(300);
  digitalWrite(2, LOW);
  delay(300);
  digitalWrite(2, HIGH);
  delay(300);
  digitalWrite(2, LOW);
  delay(300);
  ignoreMessages = 3;
  Serial.println("xfeedback register /event/message");
  delay(1000);
  char buffer[1024];

  sprintf(buffer, "m=cpe,v=%s,t=0,p=%s,s=%s", String(PROTOCOL_VERSION), String(PRODUCT), serialNumber);
  xapiMessage(buffer);

  extSerial1.begin(9600, SERIAL_8N1, S1RX, S1TX);
}


String inputs1 = "";
String inputs2 = "";

void loop() {

  while (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    std::map<String, String> dict = parseString(extractMessage(input));
    if (dict["m"] == "cpe") {  //Discovery request
      if (dict["t"] == "1") {
        send_discovery_reply();
      }
      if (dict["s"] == serialNumber) {
        if (dict["t"] == "3") {  //Identify (flash led)
          identify();
        }
        if (dict["t"] == "5") {  //Open serial port
          if (dict["p"] == "s1") {
            openS1(dict["b"], dict["c"], dict["e"]);
          }
          if (dict["p"] == "s2") {
            openS2(dict["b"], dict["c"], dict["e"]);
          }
        }
        if (dict["t"] == "11") {  //Send serial
          if (dict["p"] == "s1") {
            sendS1(dict["d"]);
          } else if (dict["p"] == "s2") {
            sendS2(dict["d"]);
          }
        }
        if (dict["t"] == "15") {  //Set pin mode
          configurePin(dict["p"], dict["i"]);
        }
        if (dict["t"] == "17") {  //Digital write
          pinDigitalWrite(dict["p"], dict["v"]);
        }
        if (dict["t"] == "19") {  //Analog write
          pinAnalogWrite(dict["p"], dict["v"]);
        }
        if (dict["t"] == "21") {  //Digital read
          pinDigitalRead(dict["p"], dict["r"]);
        }
        if (dict["t"] == "23") {  //Analog read
          pinAnalogRead(dict["p"], dict["r"]);
        }
        if (dict["t"] == "MAIN_LOOP_DELAY") {
          mainLoopDelay = dict["v"].toInt();
          xapiMessage("m=cpe,t=-1,s=" + serialNumber + ",k=" + dict["t"] + ",v=" + dict["v"]);
        }
      }
    }
  }

  if (s1Opened) {
    while (extSerial1.available()) {
      char c = extSerial1.read();



      if (String(c) != s1term) {
        inputs1 += c;
      } else {


        dataReceived("s1", inputs1);
        inputs1 = "";
      }
    }
  }

  if (s2Opened) {
    while (extSerial2.available()) {
      char c = extSerial2.read();

      if (String(c) != s2term) {
        inputs2 += c;
      } else {

        dataReceived("s2", inputs2);
        inputs2 = "";
      }
    }
  }
  delay(mainLoopDelay);
}
