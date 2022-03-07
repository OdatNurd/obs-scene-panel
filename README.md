# OBS Record Template Panel

[OBS Studio](https://obsproject.com/) is free and open source software for
video recording and live streaming; many (including myself) use it for [Twitch
streaming](https://twitch.tv/odatnurd) and also for creating [YouTube
videos](https://youtube.com/c/OdatNurd). When recording, OBS allows you to set
a template filename to specify the names of the files that are being recorded
using variables that expand out to dates and times.

While this works well for long form content such as live streams or long
single-take videos that are going to be edited down, it gets in the way of a
more scene based (script based scenes, not OBS scenes) recording because the
template only allows you to specify dates and times.

So, enter "OBS Record Template Panel", a wholly boring and confusing name for a
rather simplistic premise: what if OBS had a panel that would allow you to
specify a video title and the number of the scene that you're recording, so
that you could easily alter the name of the file that will be recorded?

The panel looks like this:

![OBS Scene Panel](https://github.com/OdatNurd/obs-scene-panel/blob/master/obs-scene-panel.png?raw=true)


At the top is the currently configured recording template; the text field
allows you to enter a video name and a scene number; changing either will reset
the template to the new value. Now you can record scene by scene and end up
with files that aren't just a confusing jumble of dates.

## Usage

This requires that you install the 
[obs-websocket plugin](https://obsproject.com/forum/resources/obs-websocket-remote-control-obs-studio-from-websockets.466/), 
as the panel uses it to communicate with OBS.  The panel assumes a port of 
`4444` and no password; you may need to adjust the connection call in 
`panel.js` as appropriate.

Other code changes you might want to do include changing up the default
template if you're not also hep on having your recordings easily sortable by
their record time, or changing the stylesheet if you use a different theme or
would otherwise like some other visuals.

Once all of your pre setup is done, clone the repository somewhere, use
`yarn install` to install dependencies and `yarn build` to create the panel,
which will be a file named `index.html` in the `dist` folder.

Using `View > Docks`, create a `file://` URL and point it to the index file you
just created (if you're unsure, opening the file in your browser is a handy way
to get the browser to tell you what the URL should be). In a pinch you can also
just use the panel directly from your browser as well, which may be easier than
constantly squirreling yourself into the OBS preferences.

## Notes

This is a very simple project, but hopefully is useful to others either as a
handy way to get something like this going or as a simple example of how to
extend OBS with custom panels.

Feel free to extend this in any way you see fit; if you find it useful or
helpful in any way, please let me know!
