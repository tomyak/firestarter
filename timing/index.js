'use strict';
const moment = require('moment-timezone');
var db
var admin
const MAX_BATCH = 500
var config  = (settings)=>{
  db    = settings.db
  admin = settings.admin
}


var waitUntil = (fn,ms=10000,tick=1000)=>{
  const endtime=moment().add(ms,'milliseconds')
  return new Promise((resolve,reject)=>{
    let timer
    let done=false
    const checkVal=()=>{
      done=fn()
      if (done){
        resolve(done)
      } else if (moment().isAfter(endtime)) {
        reject('Timeout')
      } else {
        setTimeout(checkVal,tick)
      }
    }
    checkVal()
  })
}

var waitForQuery = (snap,ms=10000)=>{
  return new Promise((resolve,reject)=>{
    let timer
    let unsubscribe
    let done=false
    const cleanUp=()=>{
      if (typeof(unsubscribe)==='function'){
        unsubscribe()
        unsubscribe=null
      }
      if (timer){
        clearTimeout(timer)
        timer=null
      }
    }
    timer = setTimeout(function(){
      timer=null
      cleanUp()
      if (!done){
        done=true
        reject(`Timeout`)
      }
    },ms)

    unsubscribe = snap.onSnapshot((snapshot)=>{
      if (!snapshot.exists && !snapshot.size){
        return
      }
      cleanUp()
      if (!done){
        done=true
        resolve(snapshot)
      }
    },(err)=>{
      cleanUp()
      if (!done){
        done=true
        reject(snapshot)
      }
    })
  })
}

var pause = (ms)=>{
  var start = Date.now()
  return new Promise((resolve, reject)=>{
      setTimeout(()=>{
        var elapsed = Date.now() - start
        resolve(elapsed)
      },ms)
  });
}

module.exports = {
  name:"timing",
  config,
  waitUntil,
  waitForQuery,
  pause
}
