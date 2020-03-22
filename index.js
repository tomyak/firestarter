'use strict';
let admin
let db

const triggers = require('triggers');
const batchy = require('batchy');
const timing = require('timing');


const config = (settings)=>{
  // console.error(`Configuring 🔥firestarter components`);
  db = settings.db
  admin = settings.admin
  configComponents()
}

var configComponent = (proc)=>{
  // console.error(`Configuring 🔥firestarter component ${proc.name}`);
  if (proc && typeof(proc.config)==='function'){
    proc.config({
      db:db,
      admin:admin
    })
  }
}

const configComponents = ()=>{
  [triggers,batchy,timing].forEach(configComponent)
}
const initializeApp = (settings)=>{
  settings = settings || admin.credential ? admin.credential.applicationDefault() : null || { projectId: process.env.FIREBASE_PROJECT, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
  admin = require('firebase-admin');
  admin.initializeApp(settings);
  db = admin.firestore()
  db.settings({ timestampsInSnapshots: true });
  configComponents()
}

module.exports = {
  config,
  initializeApp,
  batchy,
  triggers,
  timing
}
