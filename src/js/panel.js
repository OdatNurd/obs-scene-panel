// =============================================================================


const { getOBSObject } = require('./websocket');

const sanitize = require("sanitize-filename");


// =============================================================================


/* The panel controls that relate to what the current recording information is;
 * the name of the video, which scene this is, and controls for bumping it up
 * and down. */
const videoNameFld = document.getElementById('video-name');
const sceneNmbrFld = document.getElementById('scene-number');
const prevSceneBtn = document.getElementById('scene-prev-btn');
const nextSceneBtn = document.getElementById('scene-next-btn');
const templateTxt = document.getElementById('recording-template');

// =============================================================================


/* The OBS functionality provided by the library we're using is such that as
 * events happen in OBS (switching scenes, recording starting and stopping, and
 * so on) we get an event.
 *
 * We can also transmit messages directly to Obs to ask for information, and
 * this takes the form of a promise that gives us the data that comes back when
 * the promise resolves.
 *
 * It is often handy to decouple this such that we can ask for data and get an
 * event with the result.
 *
 * This function does that for us, allowing you to do a send over the given
 * OBS object, and when the result comes back it will emit an event with the
 * same name as the request with the resulting data.
 *
 * Note that it is up to the caller to make sure that they don't make a request
 * for something for which Obs already has an event. */
function sendAsEvent(obs, request, ...args) {
  obs.send(request, ...args)
     .then(data => obs.emit(request, data))
     .catch(err => console.log(`[OBS] Error requesting ${request}`));
}


// =============================================================================


/* This is a factory function which will return a callback suitable for use
 * with the getOBSObject function, and will adjust the div with the ID you pass
 * in here so that the text content and class represents the connection state
 * of some socket.
 *
 * Every time a connection is made, we grab out the current filename format for
 * recording so that we can populate the form. */
function trackConnectionState(divId) {
  const connectionTxt = document.getElementById(divId);

  return (obs, connected) => {
      // Flip the class states around based on the incoming status.
      connectionTxt.classList.remove(connected ? 'disconnected' : 'connected')
      connectionTxt.classList.add(connected ? 'connected' : 'disconnected')

      connectionTxt.innerText = connected ? 'Connected' : 'Disconnected';

      if (connected === true) {
        // When we connect, ask OBS for the current filename format; the
        // reception of this should come as an event; when that event is handled
        // we will use it to populate the form and enable controls as needed.
        console.log('[OBS] Asking the recording format string');
        sendAsEvent(obs, 'GetFilenameFormatting');
      } else {
        // If we're not connected, disable all of the controls on the page to
        // stop anyone from interacting with them.
        [videoNameFld, sceneNmbrFld, prevSceneBtn, nextSceneBtn].forEach(e => e.disabled = true);
      }
    }
}


// =============================================================================


/* All of the controls in the panel are slaved to the video name field; if it is
 * empty, then all other controls must be disabled because a video name is
 * absolutely required for us to be able to do anything.
 *
 * When invoked, this will check the current value of the video name, and either
 * make sure all other controls are disabled, or cause them to be updated as
 * appropriate for their current state. */
function videoNameUpdate() {
  // When the video name field is empty (or just whitespace), disable all of the
  // scene buttons. Otherwise, make sure that the user can type in the scene
  // field and then update the remainder of the panel.
  if ((videoNameFld.value).trim() === '') {
    [sceneNmbrFld, prevSceneBtn, nextSceneBtn].forEach(e => e.disabled = true);
  } else {
    sceneNmbrFld.disabled = false;
    sceneBtnsUpdate();
  }
}


// =============================================================================


/* Update the enabled/disabled state of the buttons that control the scene
 * number based on the contents of the scene number field; when it's empty or
 * not a valid scene, both buttons are disabled. Otherwise, the buttons are
 * enabled except that the previous scene button has to be disabled when the
 * current scene is 1, since there is no scene 0.
 *
 * This should only be invoked when we know that there is a valid scene name;
 * in all other cases all of the scene controls should always be disabled no
 * matter what. */
function sceneBtnsUpdate() {
  // Start off assuming the scene buttons should be enabled.
  [prevSceneBtn, nextSceneBtn].forEach(e => e.disabled = false);

  // When the scene field is blank, not a number, or is less than zero, disable
  // the scene buttons. Otherwise, they can stay enabled unless the scene is 1,
  // in which case the previous scene button needs to be disabled.
  const scene = parseInt(sceneNmbrFld.value);
  if (isNaN(scene) === true || scene < 0) {
    [prevSceneBtn, nextSceneBtn].forEach(e => e.disabled = true);
  } else if (scene <= 1) {
    prevSceneBtn.disabled = true;
  }
}


// =============================================================================


/* Update the scene number from it's current value, either up or down by one
 * depending on the argument provided. Once the update is made, the scene
 * buttons will be updated to enable or disable them as appropriate. */
function bumpSceneNumber(obs, increment) {
  // Grab the current scene number
  const scene = parseInt(sceneNmbrFld.value);

  // Adjust the scene up or down as appropriate; if it didn't have a number
  // before then set it to be 1. Once that's done, update the buttons.
  sceneNmbrFld.value = isNaN(scene) ? 1 : (increment ? scene + 1 : scene - 1);
  sceneBtnsUpdate();

  // Transmit a new format string, if possible.
  sendFormatString(obs);
}


// =============================================================================


/* This is invoked when the user presses a key while any of the text fields has
 * the input focus.
 *
 * If the key that was pressed is one of the Enter keys, an attempt is made to
 * transmit away a format string; this may actually do nothing if the form input
 * is not complete or otherwise invalid. */
function submitInput(obs, event) {
  // We only care about the enter keys
  if (event.code !== 'Enter' && event.code !== 'NumpadEnter') {
    return;
  }

  // Transmit a new format string, if possible.
  sendFormatString(obs);
}


// =============================================================================


/* This is invoked with the format string that represents how OBS is currently
 * structuring the filenames that it's recording.
 *
 * Based on this, the panel content is updated such that the format string is
 * displayed, the form fields are updated with the appropriate content based on
 * the string, and enabled or disabled as required. */
function receiveFormatString(formatString) {
  // Make sure that the template text is updated in the panel first.
  templateTxt.innerText = formatString;

  // Check the incoming string to see if it matches the format that we expect;
  // if so, then use it to populate the fields before we continue.
  const match = formatString.match(/^%hh%mm_(.*)_Scene_(\d+)$/);
  if (match !== null) {
    videoNameFld.value = match[1].replace(/_/g, ' ');
    sceneNmbrFld.value = match[2];
  }

  // We default to the text fields being enabled so that the user can type into
  // them.
  [videoNameFld, sceneNmbrFld].forEach(e => e.disabled = false);

  // Update the video name field controls based on the current value it has;
  // depending on that value it will enable or disable the other controls as
  // needed, since they are all slaved to the name field.
  videoNameUpdate();
}


// =============================================================================


/* This is invoked to attempt to use the form values as they current exist to
 * transmit a message to OBS asking it to change the template filename for
 * recordings based on the current panel contents.
 *
 * This will do nothing if the controls don't have valid values; otherwise it
 * will ask OBS to change the format. When this happens all of the controls are
 * disabled and we request the new format string so that the form will update
 * with the results when they return, also enabling the controls. */
function sendFormatString(obs) {
  // Get the current video name and scene, if any. We trim all leading/trailing
  // whitespace from the video name, and title case it.
  const video = videoNameFld.value.trim().replace(/(^|\s)\S/g, t => t.toUpperCase());
  const scene = parseInt(sceneNmbrFld.value);

  // If the video name is empty or the scene is not a number, then just leave
  // without doing anything else; there is nothing we can update.
  if (video === '' || isNaN(scene) === true || scene < 1) {
    return;
  }

  // Create the new template filename and display it.
  const template = `%hh%mm_${sanitize(video.replace(/\s/g, '_'))}_Scene_${scene}`;
  console.log(`[OBS] Changing filename template to '${template}'`);

  // Disable all of the form controls, and then send away a message to ask OBS
  // to change the recording filename format. We send this as an event so that
  // we can respond to it finishing by asking what it did.
  [videoNameFld, sceneNmbrFld, prevSceneBtn, nextSceneBtn].forEach(e => e.disabled = true);
  sendAsEvent(obs, 'SetFilenameFormatting', {'filename-formatting': template});
}


// =============================================================================


/* Set up all of our handlers and kick the panel off; this will among other
 * things make sure that we're connected to OBS and that we're listening for the
 * appropriate events. */
async function setup() {
  // Get the OBS connection object; this will remain connected and constantly
  // try to reconnect if the connection fails.
  const obs = getOBSObject("localhost", 4444, trackConnectionState('connection-state'));

  // The buttons for changing scenes will, if they are enabled, bump the current
  // scene number up or down. If the scene number actually changes, a message
  // will be sent to OBS to get it to change the filename format.
  prevSceneBtn.addEventListener('click', () => bumpSceneNumber(obs, false));
  nextSceneBtn.addEventListener('click', () => bumpSceneNumber(obs, true));

  // When the text in the video name or scene number inputs change, check to see
  // if they're valid and update the controls in the panel as appropriate.
  videoNameFld.addEventListener('input', () => videoNameUpdate());
  sceneNmbrFld.addEventListener('input', () => sceneBtnsUpdate());

  // When a key is pressed while any of the input fields has the focus, check
  // to see if this is an attempt by the user to submit the panel input and if
  // so, do it.
  videoNameFld.addEventListener('keydown', event => submitInput(obs, event));
  sceneNmbrFld.addEventListener('keydown', event => submitInput(obs, event));

  // When we connect, and when we change the current recording file name format,
  // we ask OBS what it's current filename format is; this listens for the
  // return value so that we always know what it's going to be.
  obs.on('GetFilenameFormatting', data => {
    console.log(`[OBS] Current filename formatting is '${data.filenameFormatting}'`);
    receiveFormatString(data.filenameFormatting);
  });

  // When a recording starts, disable all of of the controls so that the user
  // knows that they can't do anything with it.
  obs.on('RecordingStarting', data => {
    console.log('[OBS] Recording starting');
    [videoNameFld, sceneNmbrFld, prevSceneBtn, nextSceneBtn].forEach(e => e.disabled = true);
  });

  // When a recording stops, trigger a request for the current format string and
  // use it to re-enable and re-populate the panel.
  obs.on('RecordingStopped', data => bumpSceneNumber(obs, true));

  // When we get a response from setting the filename to be used to record,
  // respond by asking what the new filename is, so that the panel will update
  // and the controls will set the correct status.
  obs.on('SetFilenameFormatting', data => sendAsEvent(obs, 'GetFilenameFormatting'));
}


// =============================================================================


setup();
