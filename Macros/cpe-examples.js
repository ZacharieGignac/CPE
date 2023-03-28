/*
CISCO PORT EXPANSION - EXAMPLES
VERSION 0.0.1
THIS IS ALPHA SOFTWARE. USE AT YOUR OWN RISK.
*/

import xapi from 'xapi';
import { cpe, cpe_discover, gpio, serialPort, analogRead, SERIALPORT, PINMODE, DIGITAL } from './cpe';

/* ESP32 serial number */
let serial_number = '75B8'; //Find this information by running a discovery. Check at the bottom of this file.


async function readStyle1() {
  /* THIS IS STYLE 1 */
  /* "The C# programmer" */

  /* Create a port expansion handler */
  let myEsp32 = cpe(serial_number);

  /* Get a reference to all pins */
  let allPins = gpio(myEsp32);

  /* Get the pin 33 */
  let pin33 = allPins.getPin(33);

  /* Set the pin33 mode to "INPUT" */
  pin33.pinMode(PINMODE.INPUT);

  /* Read the analog value of pin33, synchronously */
  try {
    console.log(await pin33.analogRead());
  }
  catch (err) {
    console.log('Error reading pin 33: ' + err);
  }

  /* Read the analog value, asynchronously */
  pin33.analogRead().then(value => {
    console.log(value);
  })
    .catch(err => {
      console.log('Error reading pin 33: ' + err);
    });


}

async function readStyle2() {
  /* THIS IS STYLE 2 */
  /* "The on-the-fence programmer" */

  /* Create a port expansion handler */
  let myEsp32 = cpe(serial_number);

  /* Get a reference to all pins */
  let allPins = gpio(myEsp32);

  /* Set pin 33 mode */
  allPins.pinMode(33, PINMODE.INPUT);

  /* Read the analog value of pin33, synchronously */
  try {
    console.log(await allPins.analogRead(33));
  }
  catch (err) {
    console.log('Error reading pin 33: ' + err);
  }

  /* Read the analog value, asynchronously */
  allPins.analogRead(33).then(value => {
    console.log(value);
  })
    .catch(err => {
      console.log('Error reading pin 33: ' + err);
    });
}

async function readStyle3() {
  /* THIS IS STYLE 3 */
  /* "The YOLO programmer" */

  /* Create a port expansion handler */
  let myEsp32 = cpe(serial_number);

  /* Read the analog value of pin33, synchronously */
  try {
    console.log(await analogRead(myEsp32, 33));
  }
  catch (err) {
    console.log('Error reading pin 33: ' + err);
  }

  /* Read the analog value, asynchronously */
  analogRead(myEsp32, 33).then(value => {
    console.log(value);
  })
    .catch(err => {
      console.log('Error reading pin 33: ' + err);
    });
}



async function serialPortDemo() {

  /* Create a port expansion handler */
  let serialadapter = cpe(serial_number);

  //Configuring serial port
  let lgtv = serialPort(serialadapter, SERIALPORT.S1, 9600, '8N1', '\r');

  lgtv.onBoot(event => {
    console.log(`Device ${event.model} (${event.serial}) just rebooted.`);
  });

  //Waiting for serial port open
  await lgtv.open();

  //Handling incoming data from TV
  lgtv.onData(data => {
    console.log('Data received from LG TV: ' + data);
  });

  //serialadapter.raw('MAIN_LOOP_DELAY',2000);

  lgtv.send(`ka 00 01\r\n`); //Power ON TV!

}

async function ledDemo() {
  /* Create a port expansion handler */
  let myEsp32 = cpe(serial_number);

  /* Get a reference to all pins */
  let allPins = gpio(myEsp32);

  /* Get the pin 32 */
  let pin32 = allPins.getPin(32);

  /* Set the pin32 mode to "OUTPUT" */
  pin32.pinMode(PINMODE.OUTPUT);

  /* Listen to the toggle action */
  xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
    if (action.WidgetId == 'tglled') {
      /* Set the relay state */
      pin32.digitalWrite(action.Value == 'on' ? DIGITAL.HIGH : DIGITAL.LOW);
    }
  });

}

// cpe_discover();       // <--- Run this to discover connected boards
// ledDemo();            // <-- Run this for the led control demo. Add a toggle named "tglled" to a panel
// serialPortDemo();     // <-- Run this for serial port demo.
// readStyle1();         // <-- analog read demo style 1
// readStyle2();         // <-- analog read demo style 2
// readStyle3();         // <-- analog read demo style 3