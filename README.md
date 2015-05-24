# Cannonville

Cannonville is a log storage service that you can use instead of a traditional database like MongoDB or MySQL.

### What is a log?
When we say log, we specifically mean an ordered, append-only list of immutable objects. In this document, we'll be referring to these objects as *events*. The log cannot be reordered, events can only be added to the end of it, and items cannot be deleted or altered. Sort of how deposits and withdrawals in a bank account works.

### What is Event Sourcing?
Applications built on top of Cannonville uses the event sourcing pattern for storage. Event sourcing means that you infer your data model from a big log of events instead of persisting the data model. For example, when using event sourcing, you wouldn't store the score of a user - instead you would infer the score from a series of win and lose events. [This video gives a good introduction to event sourcing](https://www.youtube.com/watch?v=JHGkaShoyNs).

### Durable, fast and scalable
Built on top of Apache Kafka, Cannonville shares many of it's characteristics: It replicates and shards your log over multiple machines, making it both resistent to hardware failure, and allows it to scale horizontally, handling tens of thousands of events per second and can handle the log data set growing very large.

## Introduction to the API

The Cannonville API is very simple - it only has three functions, *write*, *play* and *replay*.

Let’s learn about `write` first, which appends an event to the log:

```javascript
import cannonville from 'cannonville'
let connection = cannonville('my-cannonville-server:4444/greeting-app');
connection.write({
  body: {
    hello: 'world'
  }
})
```

The code above just stored an event permanently. The event cannot be altered or deleted. Cannonville logs are very durable - they are immediately written to disk and shortly replicated across multiple machines.

Getting data out of Cannonville is also very simple. You can use either *play* or *replay*. They work almost the same way - the main difference is that *replay* consumes all events that have been written since the beginning of time, while *play* only consumes events that are written after we started `play`ing.

For example:

```javascript
import cannonville from 'cannonville'
let connection = cannonville('my-cannonville-server:4444/greeting-app')
connection.write({ body: { hello: 'world1' } })
connection.write({ body: { hello: 'world2' } })
setTimeout(function() {
  connection.replay(function(event, ack) {
    console.log(event.body.hello)
    // Now we tell Cannonville that we’ve handled the message,
    // which will make Cannonville send us the next one:
    ack()
  })
}, 100)
setTimeout(function() {
  connection.write({ event: { hello: 'world3' } })
}, 200)
```
The code above will print:
```
world1
world2
world3
```

Notice that the "world3" event is written *after* replay was called, but even so, it is still printed! This is because *replay* keeps running even after it has reached the last event in the log, and keeps listening for more - feeding any new events to the callback as they are written. If you had used *play* instead of replay, the program would only have printed the “world3” event - as mentioned before, replay starts from the beginning of the log, while play will only consume events that are written after play was started.

That’s it! You now know the basics of using Cannonville!

## Resuming playback

One thing that might have struck you in the above examples is that (re)play doesn’t seem to require some sort of offset parameter. You might be wondering ”Can I only replay from from the beginning of the log? What if I ever need to resume from the middle?”

The answer is that Cannonville manages offset for you. The offset for a `play` or `replay` is persisted server-side, inside Cannonville, so if the application code that is `replay`ing events stops for some reason (such as a crash) and restarted,  `replay` will resume after the last event the callback passed to `play` or `replay` called `ack()` for.

For this to work, we need to pass a *player id* when we call replay.
Let's have a look at how that work. For example, let’s say that we’ve written
a couple of events to Cannonville:
```javascript
import cannonville from 'cannonville'
let connection = cannonville('localhost:1234')
connection.write({ body: { hello: 'world1' } })
connection.write({ body: { hello: 'world2' } })
connection.write({ body: { hello: 'world3' } })
connection.write({ body: { hello: 'world4' } })
connection.write({ body: { hello: 'world5' } })
```
Now, in a separate script, we replay these events, but we’ve rigged it to crash the process after the second message:
```javascript
import cannonville from 'cannonville'
let connection = cannonville(‘localhost:1234’)
connection.replay('helloPrinter', function(event, ack) {
  console.log(event.body.hello)
  ack()
	// Simulate a crash after acknowledging the second message.
  if (event.hello ===  'world2') throw new Error('OH NO CRASH');
})
```
Running the above script will print something like this to the console:
```
world1
world2
Error: OH NO
```
Now, running the same code a *second* time, will result in this:
```
world3
world4
world5
```
Running the code a third time will not print anything at all.

This is all because Cannonville keeps track what events have already been `ack()`knowledged by the replayer, and will resume on the next event after it. To achieve this, Cannonville needs to be able to tell different players apart. That is why you need to pass a *player id* - in the code above, the player id is "helloPrinter". If you changed the name to "helloPrinter2" in the script, and re-ran it, `replay` would once again resume from the beginning of the log, and you’d once again get this result:
```
world1
world2
Error: OH NO
```
You do no have to pass a *player id* to replay (in the code example in the introduction, we do not) if you don’t care about resuming where you left off. Without a session name, `replay` will simply always resume from the beginning. session name is available on *replay* only. *play* sessions are not persistent.

## Stop
As both `play` and `replay` keeps running until further notice, you will need a way to shut them down. Both play and replay return a function that, when called, disconnects from Cannonville and allows your app to garbage collect it. Doing this does *not* delete the session in Cannonville, so you can still resume it later.

```
var stop = connection.replay('waitForSomeThingSession', function(event, ack) {
  // Do stuff with the event
  ack()
})

setTimeout(function() {
  stop();
}, 10000)
```

## Ordering guarantees
Events written to Cannonville will be played and replayed in *roughly* the same order that they were written. This is fine in surprisingly many cases, but there are cases when ordering of events is very important. For instance, you might be building a playlist system for a music service, and the playlist state is calculated from a series of add, remove, and re-order events.

Fortunately, Cannonville allows you to `play` and `replay` events in the *exact* order they were written - all you need is to assign each event to a *saga* when you’re writing it.

A *saga* is just a string id. When provided, Cannonville will make sure that events with the same saga are `play`ed  in the order that they were written. For example, in the playlist example above, the playlist id would be your *saga*. In a bank account, the *saga* would be the account number.

To put an event under a saga, you simply provide an extra property called *saga* in the options object passed to `write`:

```javascript
import cannonville from 'cannonville'
let connection = cannonville(‘localhost:1234’)
connection.write({
	saga: ’1234’,
	body: {
    playlist: 1234,
    type: ‘add’,
    name: ’Never gonna give you up’,
    index: 0
  }
})
connection.write({
	saga: ’1234’,
	body: {
		playlist: 1234,
    type: ‘add’,
    name: ’Love me tender’,
    index: 1
  }
})
connection.write({
	saga: ’1234’,
	body: {
	  playlist: 1234,
    type: ‘remove’,
    index: 0
  }
})
```
## Expect the occasional re-delivery!
Cannonville provides an at-least-once delivery guarantee. This means that the same message is guaranteed to be constantly re-delivered to the `play`/`replay` callback until they are `ack()`ed, but if Cannonville itself crashes, **events may be delivered more than once!** This means that the callback passed to `replay` and `play` needs to take this into account. Luckily, the event object passed to the (re)play callback has a unique *id* property, making this trivial.


## Handling concurrent writes
Let’s say that the Playlist system that you’re building is really fancy, and multiple users can share one playlist. Imagine a user that is just about to delete a song in a playlist. Now, imagine that there is a another user that in that moment deletes the song above it. Before this state is replicated to the first user, she also deletes her song. However, since the reality of her client is no longer current (the indexes have moved around), the index that her client tells the server to delete will actually not reflect the intent, and we’ll delete the wrong song!

Cannonville offers a tool for handling this problem called *expectedTail*.

Remember, the event object passed to the (re)play callback has a unique id property. In your client, you keep track of the last event id your client has seen within the playlist saga. Then, when writing changes, you pass in this id as the expectedTail. If the id of the last event that has happened on the same saga doesn’t equal expectedTail, the insert will yield an error, and the client can present the user with a message saying something along the lines of ”Another user modified the playlist at the same time you did”. You need to pass *saga* if you’re passing *expectedTail*.

// TODO: Code example of expectedTail usage
