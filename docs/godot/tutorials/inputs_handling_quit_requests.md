# Handling quit requests

## Quitting

Most platforms have the option to request the application to quit. On desktops, this is usually done with the "x" icon on the window title bar. On mobile devices, the app can quit at any time while it is suspended to the background.

## Handling the notification

On desktop and web platforms, `Node <class_Node>` receives a special `NOTIFICATION_WM_CLOSE_REQUEST` notification when quitting is requested from the window manager.

Handling the notification is done as follows (on any node):

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="notification">notification</span>(what):  
if what == NOTIFICATION_WM_CLOSE_REQUEST:  
get_tree().quit() \# default behavior

<div class="code-tab">

csharp

</div>

public override void <span id="notification">Notification</span>(int what) { if (what == NotificationWMCloseRequest) { GetTree().Quit(); // default behavior } }

</div>

It is important to note that by default, Godot apps have the built-in behavior to quit when quit is requested from the window manager. This can be changed, so that the user can take care of the complete quitting procedure:

<div class="tabs">

.. code-tab:: gdscript GDScript

get_tree().set_auto_accept_quit(false)

<div class="code-tab">

csharp

</div>

GetTree().AutoAcceptQuit = false;

</div>

## On mobile devices

There is no direct equivalent to `NOTIFICATION_WM_CLOSE_REQUEST` on mobile platforms. Due to the nature of mobile operating systems, the only place that you can run code prior to quitting is when the app is being suspended to the background. On both Android and iOS, the app can be killed while suspended at any time by either the user or the OS. A way to plan ahead for this possibility is to utilize `NOTIFICATION_APPLICATION_PAUSED` in order to perform any needed actions as the app is being suspended.

> [!NOTE]
> On iOS, you only have approximately 5 seconds to finish a task started by this signal. If you go over this allotment, iOS will kill the app instead of pausing it.

On Android, pressing the Back button will exit the application if **Application \> Config \> Quit On Go Back** is checked in the Project Settings (which is the default). This will fire `NOTIFICATION_WM_GO_BACK_REQUEST`.

## Sending your own quit notification

While forcing the application to close can be done by calling `SceneTree.quit <class_SceneTree_method_quit>`, doing so will not send the `NOTIFICATION_WM_CLOSE_REQUEST` to the nodes in the scene tree. Quitting by calling `SceneTree.quit <class_SceneTree_method_quit>` will not allow custom actions to complete (such as saving, confirming the quit, or debugging), even if you try to delay the line that forces the quit.

Instead, if you want to notify the nodes in the scene tree about the upcoming program termination, you should send the notification yourself:

<div class="tabs">

.. code-tab:: gdscript GDScript

get_tree().root.propagate_notification(NOTIFICATION_WM_CLOSE_REQUEST)

<div class="code-tab">

csharp

</div>

GetTree().Root.PropagateNotification((int)NotificationWMCloseRequest);

</div>

Sending this notification will inform all nodes about the program termination, but will not terminate the program itself *unlike in 3.X*. In order to achieve the previous behavior, `SceneTree.quit <class_SceneTree_method_quit>` should be called after the notification.
