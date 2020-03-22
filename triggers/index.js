'use strict';
const FIVE_MINUTES = 300000;

var config  = (settings)=>{

}

var eventAge = (event)=>{
  return Date.now() - Date.parse(event.timestamp);
}

var eventTooOld = (context,max_age=null)=>{
  const eventAgeMs = eventAge(context)
  let max = max_age || FIVE_MINUTES
  if (eventAgeMs > max) {
    console.error(`Dropping event ${context} with age[ms]: ${eventAgeMs}`);
    return true;
  }
  return false
}

var fieldChanged = (field,change)=>{
  return fieldChanges([field],change).includes(field)
}

var fieldChanges = (fields,change)=>{
  var updateFields = []
  if (change.after.exists){
    var newGuy = change.after.data()
    if (change.before.exists){
      var oldGuy = change.before.data()
      updateFields = fields.filter(f=>newGuy.hasOwnProperty(f) || oldGuy.hasOwnProperty(f)).filter(f=>JSON.stringify(oldGuy[f],null,2)!==JSON.stringify(newGuy[f],null,2))
    } else {
      updateFields = fields.filter(f=>newGuy.hasOwnProperty(f))
    }
  }
  return updateFields
}

var isUpdate = (change)=>{
  return (change.after.exists && change.before.exists)
}

var isCreate = (change)=>{
  return (change.after.exists && !change.before.exists)
}

var isDelete = (change)=>{
  return (!change.after.exists && change.before.exists)
}

var fieldChangedTo = (field,value,change)=>{
  return (isUpdate(change) && change.before.data()[field]!=value && change.after.data()[field]==value)
}


module.exports = {
  name:"triggers",
  eventTooOld,
  eventAge,
  fieldChanges,
  fieldChanged,
  fieldChangedTo,
  isUpdate,
  isCreate,
  isDelete,
  config
}
