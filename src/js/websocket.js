// =============================================================================


const OBSWebSocket = require('obs-websocket-js')


// =============================================================================


/* Attempt to connect the given OBS object to the address provided. */
async function connectObs(obs, address) {
  console.log(`[OBS] Connecting to ${address}`);

  try {
    await obs.connect({ address });
  }
  catch (err) {
    console.log(`[OBS] Unable to connect: ${err.error}`);
  }
}


// =============================================================================


/* This is a simple wrapper that will create and return an instance of the OBS
 * WebSocket functionality that we use, which will try to remain connected to
 * the host and port provided.
 *
 * The returned instance will detect connection errors and attempt to reconnect
 * every 5 seconds.
 *
 * If provided, the callback will be invoked every time the connection state
 * changes, and be passed the OBS object and a boolean that's true if the socket
 * is connected and false if it's not. */
function getOBSObject(hostname, port, callback) {
  // Create a new OBS WebSocket wrapper object for our use, and construct the
  // address that we will connect to.
  const obs = new OBSWebSocket();
  const address = `${hostname}:${port}`;

  // Whenever our connection opens, trigger any callback to let interested
  // parties know.
  obs.on('ConnectionOpened', () => {
    console.log('[OBS] Connected');
    if (callback !== undefined) {
      callback(obs, true);
    }
  });

  // If the connection closes, let any interested party know, then wait a few
  // seconds and then attempt to connect again.
  obs.on('ConnectionClosed', () => {
    console.log('[OBS] Disconnected');
    if (callback !== undefined) {
      callback(obs, false);
    }

    // Wait a second and then try to connect again.
    setTimeout(() => {
      console.log('[OBS] Attempting re-connection');
      connectObs(obs, address);
    }, 5000)
  });

  // If any error is detected on the socket, record it. We don't need to
  // actually do anything here; the library throws some socket errors and
  // doesn't handle them itself, but any time that happens the connection will
  // ultimately cycle.
  obs.on('error', err => {
    console.log(`[OBS] Error detected: ${err}`);
  });

  // Before we leave, start a connection attempt.
  connectObs(obs, address);

  return obs;
}


// =============================================================================


module.exports = {
  getOBSObject,
}