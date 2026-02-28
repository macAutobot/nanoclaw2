article_outdated  
True

# Recording with microphone

Godot supports in-game audio recording for Windows, macOS, Linux, Android and iOS.

A simple demo is included in the official demo projects and will be used as support for this tutorial: <https://github.com/godotengine/godot-demo-projects/tree/master/audio/mic_record>.

You will need to enable audio input in the `Audio > Driver > Enable Input<class_ProjectSettings_property_audio/driver/enable_input>` project setting, or you'll just get empty audio files.

On iOS and iPadOS, it is also important to set the advanced **Audio \> General \> iOS \> Session Category** setting to include **Record** or **Play and Record**.

## The structure of the demo

The demo consists of a single scene. This scene includes two major parts: the GUI and the audio.

We will focus on the audio part. In this demo, a bus named `Record` with the effect `Record` is created to handle the audio recording. An `AudioStreamPlayer` named `AudioStreamRecord` is used for recording.

![image](img/record_bus.png)

![image](img/record_stream_player.png)

<div class="tabs">

.. code-tab:: gdscript GDScript

var effect var recording

func <span id="ready">ready</span>():  
\# We get the index of the "Record" bus. var idx = AudioServer.get_bus_index("Record") \# And use it to retrieve its first effect, which has been defined \# as an "AudioEffectRecord" resource. effect = AudioServer.get_bus_effect(idx, 0)

<div class="code-tab">

csharp

</div>

private AudioEffectRecord <span id="effect">effect</span>; private AudioStreamSample <span id="recording">recording</span>;

public override void <span id="ready">Ready</span>() { // We get the index of the "Record" bus. int idx = AudioServer.GetBusIndex("Record"); // And use it to retrieve its first effect, which has been defined // as an "AudioEffectRecord" resource. <span id="effect">effect</span> = (AudioEffectRecord)AudioServer.GetBusEffect(idx, 0); }

</div>

The audio recording is handled by the `class_AudioEffectRecord` resource which has three methods: `get_recording() <class_AudioEffectRecord_method_get_recording>`, `is_recording_active() <class_AudioEffectRecord_method_is_recording_active>`, and `set_recording_active() <class_AudioEffectRecord_method_set_recording_active>`.

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="on_record_button_pressed">on_record_button_pressed</span>():  
if effect.is_recording_active():  
recording = effect.get_recording() \$PlayButton.disabled = false \$SaveButton.disabled = false effect.set_recording_active(false) \$RecordButton.text = "Record" \$Status.text = ""

else:  
\$PlayButton.disabled = true \$SaveButton.disabled = true effect.set_recording_active(true) \$RecordButton.text = "Stop" \$Status.text = "Recording..."

<div class="code-tab">

csharp

</div>

private void OnRecordButtonPressed() { if (<span id="effect.isrecordingactive">effect.IsRecordingActive</span>()) { <span id="recording">recording</span> = <span id="effect.getrecording">effect.GetRecording</span>(); GetNode\<Button\>("PlayButton").Disabled = false; GetNode\<Button\>("SaveButton").Disabled = false; <span id="effect.setrecordingactive">effect.SetRecordingActive</span>(false); GetNode\<Button\>("RecordButton").Text = "Record"; GetNode\<Label\>("Status").Text = ""; } else { GetNode\<Button\>("PlayButton").Disabled = true; GetNode\<Button\>("SaveButton").Disabled = true; <span id="effect.setrecordingactive">effect.SetRecordingActive</span>(true); GetNode\<Button\>("RecordButton").Text = "Stop"; GetNode\<Label\>("Status").Text = "Recording..."; } }

</div>

At the start of the demo, the recording effect is not active. When the user presses the `RecordButton`, the effect is enabled with `set_recording_active(true)`.

On the next button press, as `effect.is_recording_active()` is `true`, the recorded stream can be stored into the `recording` variable by calling `effect.get_recording()`.

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="on_play_button_pressed">on_play_button_pressed</span>():  
print(recording) print(recording.format) print(recording.mix_rate) print(recording.stereo) var data = recording.get_data() print(data.size()) \$AudioStreamPlayer.stream = recording \$AudioStreamPlayer.play()

<div class="code-tab">

csharp

</div>

private void OnPlayButtonPressed() { GD.Print(<span id="recording">recording</span>); GD.Print(<span id="recording.format">recording.Format</span>); GD.Print(<span id="recording.mixrate">recording.MixRate</span>); GD.Print(<span id="recording.stereo">recording.Stereo</span>); byte\[\] data = <span id="recording.data">recording.Data</span>; GD.Print(data.Length); var audioStreamPlayer = GetNode\<AudioStreamPlayer\>("AudioStreamPlayer"); audioStreamPlayer.Stream = <span id="recording">recording</span>; audioStreamPlayer.Play(); }

</div>

To playback the recording, you assign the recording as the stream of the `AudioStreamPlayer` and call `play()`.

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="on_save_button_pressed">on_save_button_pressed</span>():  
var save_path = \$SaveButton/Filename.text recording.save_to_wav(save_path) \$Status.text = "Saved WAV file to: %sn(%s)" % \[save_path, ProjectSettings.globalize_path(save_path)\]

<div class="code-tab">

csharp

</div>

private void OnSaveButtonPressed() { string savePath = GetNode\<LineEdit\>("SaveButton/Filename").Text; <span id="recording.savetowav">recording.SaveToWav</span>(savePath); GetNode\<Label\>("Status").Text = string.Format("Saved WAV file to: {0}n({1})", savePath, ProjectSettings.GlobalizePath(savePath)); }

</div>

To save the recording, you call `save_to_wav()` with the path to a file. In this demo, the path is defined by the user via a `LineEdit` input box.
