# firestarter
A set of Firebase Utilities
* batchy
* timing
* triggers
## Initialization

```
const firestarter = require('firestarter');
firestarter.initializeApp() // Will use the default credentials
```
or
```javascript
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore()
db.settings({ timestampsInSnapshots: true });

const firestarter = require('firestarter');
// Firestarter must be initialized with the firestore sdk components
firestarter.config({
  db:db,
  admin:admin
})

```

## batchy

*Batch*

Extends the firestore [batch object](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes)
* unlimited batch size using chunking
* "add" support

```
async ()=>{
  const batchy = firestarter.batchy
  let batch = new batchy.Batch()
  for(var i=0; i<501; i++){ // default batch supports only 500  

  	  // add extends the batch functionality
      batch.add( 'foo', { cnt:i} ) // add an object to the foo collection     

      // set, update, delete are the same as the existing batch object
      batch.set( db.collection('foo').doc( id ), { ) // set object in the foo collection
      batch.update( db.collection('foo').doc( id ), { ) // set object in the foo collection
  }    
  await batch.commit()  
}

```
*QueryBatch*

Allows you to perform batch operations by query
```
let batch = new batchy.QueryBatch()

// Delete all the entries in foo with bar == 42
await batch.collection('foo').where('bar','==','42').delete() // Immediately commits

// You can stack queries to all complete in one batch by passing false as the last parameter (commitNow)
await batch.collection('foo').where('bar','==','2').delete(false) // Deferred commit
await batch.collection('foo').where('panic','==',true).update( { panic:false }, false ) // Deferred commit
await batch.commit()


```


# timing

A set of convenience functions for waiting around

*pause*

Wait for a number of milliseconds
```
const timing = firestarter.timing
// I need a second...
await timing.pause(1000)
```
*waitUntil*

Wait until a function condition is not null and return the result
(Function is called repeatedly every tick milliseconds until timeout ms expire
```
const areWeDoneYet = ()=>{
	...    
}
try {
	var rc = await timing.waitUntil( areWeDoneYet, TIME_OUT,TICKS)
}
catch(err){
	// Handle timeouts
}
```

*waitForQuery*

Wait until a Firestore query returns one or more elements by creating a snapshot listener
The function returns a DocumentSnapshot or QuerySnapshot depending upon your query
Helpful if you are waiting for an asynchronous object to be populated
```
try {
	// Wait for a single document
	let myFooSnapshot = await timing.waitForQuery( db.collection('foo').doc(myId))

    // We can wait on any condition to be completed
    let panicSnapshot = await timing.waitForQuery( db.collection('foo').where('panic','==',true) )
    console.log(`There are ${panicSnapshot.size} panics`)            

} catch(err) {
	// Handle timeouts
}

```

# triggers
Some helpful methods for dealing with [firestore triggers](https://cloud.google.com/functions/docs/calling/cloud-firestore)

*eventAge*

*eventTooOld*

These methods are helpful for preventing infinite loops (and $$) in [retried functions](https://firebase.google.com/docs/functions/retries)
```
// This function is retried if it fails
exports.importantTrigger = functions
	.firestore
    .document('foo/{id}')
    .onCreate(async (snap,context)=>{
      // Check the age of the event and discard if too old
      // You can pass a max age. Default FIVE_MINUTES 300000 ms
      if (triggers.eventTooOld(context)){  
        console.error(context);

        // How old is it?        
        let age = triggers.eventAge( context )
        // Do something!!!!
        return false
      }
      // Normal processing that might fail causing the trigger to retry

    })
```

*fieldChanges*

*fieldChanged*

*fieldChangedTo*

These methods help determine what fields changed in the object if it is an update (or create)

These will only return true when the field changed from a previous value (or none)

```
exports.usersTrigger = functions.firestore
    .document('users/{id}')
    .onWrite(async (change, context) => {

      // This gets called on every update, but we only care about changes of active state to true
      if (triggers.fieldChangedTo('active',true,change)){ // Did Active change to true?
        // Do something when users activate
      }

      // We might care about email changes
      if (triggers.fieldChanged('email',change)){ // Did the email field change?
        // Do something when users activate
      }

      // We might care about a set of fields that changed      
      let changes = triggers.fieldsChanged( ['active', 'email','name','address'], context ) // Get the subset that changed
      if (changes.length > 0) {      	      
        // Do something when user changes any of these fields        

})
```


*isCreate*

*isUpdate*

*isDelete*

These methods help you process the creates, updates, and deletes separately

```
exports.usersTrigger = functions.firestore
    .document('users/{id}')
    .onWrite(async (change, context) => {

      // We do this on every change to a user record
      await callCommonMethod()

      // This gets called on every update, but we only do some things on create      
      if (triggers.isCreate(change)){
        // Do something with new users
      }

      // This gets called on every update, but we only do some things on create      
      if (triggers.isUpdate(change)){
        // Do something with updated users
      }

      // This gets called on every update, but we only do some things on create      
      if (triggers.isDelete(change)){
        // Do something when they are deleted
      }




})
```


# License

This is licensed under the MIT License
