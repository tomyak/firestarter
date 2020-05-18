'use strict';
// const admin = require('firebase-admin');
let db
// let db = admin.firestore()
const MAX_BATCH = 500 // Firestore counts transforms as writes
var config  = (settings)=>{
  db    = settings.db
}

const refCollection = (ref)=>{
  try {
    return ref._queryOptions.collectionId
  } catch (err){
    return null
  }
}

class QueryBatch {
  constructor(query_reference=null) {
    this.items = []
    this.query = query_reference
    if (this.query){
      this._collection = refCollection(this.query)
    }
    this.batch = new Batch()
    this.maps = []
    this.name = this.getName()

  }

  getName() {
    if (QueryBatch.count){
      return ++QueryBatch.count
    }
    QueryBatch.count = 1
    return QueryBatch.count
  }

  setRef(query_reference){
    this.query = query_reference
    this._collection = refCollection(this.query)
    return this
  }

  map(fn){
    this.maps.push(fn)
    return this
  }

  collection(col){
    this._collection = col
    this.query = db.collection(col)
    return this
  }

  doc(id) {
    this.query = this.query.doc(id)
    return this
  }

  where(lhs,op,rhs) {
    this.query = this.query.where(lhs,op,rhs)
    return this
  }

  async get() {
    var $this = this
    if ($this.query){
      var results = await $this.query.get()
      if (results.exists){
        var ref = db.collection($this._collection).doc(results.id)
        $this.items.push(ref)
      } else if (typeof(results.forEach)==='function') {
        results.forEach(doc=>{
          var ref = db.collection($this._collection).doc(doc.id)
          $this.items.push(ref)
        })
      }
      this.query = null
    }
    return this
  }

  mapData(ref){
    var obj = ref.data()
    this.maps.forEach(m=>{
      obj = m(obj)
    })
    return obj
  }

  resetQuery(){
    this.items = []
    this.query = null
    this._collection = null

    return this
  }

  reset(){
    this.resetQuery()
    this.maps = []
    this.batch = new Batch()
    return this
  }

  async set(obj,commitNow=true) {
    await this.get()
    this.items.forEach(ref=>{
      this.batch.set(ref,obj)
    })
    if (commitNow){
      return await this.commit()
    }
    return this.resetQuery()
  }

  async delete(commitNow=true) {
    await this.get()
    this.items.forEach(ref=>{
      this.batch.delete(ref)
    })
    if (commitNow){
      return await this.commit()
    }
    return this.resetQuery()
  }

  async update(obj,commitNow=true) {
    await this.get()
    this.items.forEach(ref=>{
      this.batch.update(ref,obj)
    })
    if (commitNow){
      return await this.commit()
    }
    return this.resetQuery()
  }

  async commit(){
    await this.batch.commit()
    return this.reset()
  }

}

class Batch {
  constructor() {
    this.items = []
    this.wheres = []
    this.name = this.getName()
  }

  getName() {
    if (Batch.count){
      return ++Batch.count
    }
    Batch.count = 1
    return Batch.count
  }

  set(ref,obj) {
    this.items.push({ action:"set", ref: ref, obj:obj })
    return this
  }

  add(collection,obj) {
    return this.set( db.collection(collection).doc(), obj )
  }

  delete(ref) {
    this.items.push({ action:'delete', ref: ref })
    return this
  }

  update(ref,obj) {
    this.items.push({ action: 'update', ref: ref, obj:obj })
    return this
  }

  transformCount(property) {
    return (typeof(property)==='object' && property.constructor && property.constructor.name && property.constructor.name.endsWith('Transform')) ? 1 : 0
  }

  writeCount(obj) {
    if (!obj){
      return 1
    }
    const propCounter = (acc,k)=>acc + this.transformCount(obj[k])
    return 1+Object.keys(obj).reduce(propCounter,0)
  }

  batchCount() {
    let msg = `Commit ${this.items.length} items`
    process.env.DEBUG && console.time(this.name + ':' + msg)
    let batchNumber = 0
    let batchSize = 0
    for(var i=0; i<this.items.length; i++){
      let item = this.items[i]
      const cost = this.writeCount(item.obj)
      if (batchSize+cost>MAX_BATCH){
        batchNumber++
        batchSize = 0
      }
      batchSize+=cost
    }
    if (batchSize>0){
      batchNumber++
    }
    process.env.DEBUG && console.log(`There are ${batchNumber} batches`)
    return batchNumber
  }

  async commit(){
    let msg = `Commit ${this.items.length} items`
    process.env.DEBUG && console.time(this.name + ':' + msg)
    let batchNumber = 0
    let batchSize = 0
    let batch = db.batch()

    const submitSubBatch = async ()=>{
      let bmsg = `Commit ${batchSize} items in batch ${batchNumber}`
      process.env.DEBUG && console.time(this.name + ':' + bmsg)
      batchNumber++
      await batch.commit()
      process.env.DEBUG && console.timeEnd(this.name + ':' + bmsg)
    }
    for(var i=0; i<this.items.length; i++){
      let item = this.items[i]

      /*
      https://firebase.google.com/docs/firestore/manage-data/transactions
      A batched write can contain up to 500 operations. Each operation in the batch counts separately towards your Cloud Firestore usage. Within a write operation, field transforms like serverTimestamp, arrayUnion, and increment each count as an additional operation.
      */
      // Count additional transforms
      const cost = this.writeCount(item.obj)

      // If this item puts us over the limit, commit the current batch first
      // If this item would set us exactly to the limit, the next object would cause a commit or if this is the
      // last object, then the final catch all will commit
      // If a single object has more than MAX_BATCH writes, then there is a hole and it cannot be batched
      if (batchSize+cost>MAX_BATCH){
        await submitSubBatch()
        batch = db.batch()
        batchSize = 0
      }

      batchSize+=cost
      batch[item.action]( item.ref, item.obj )
    }
    if (batchSize>0){
      await submitSubBatch()
    }
    process.env.DEBUG && console.timeEnd(this.name + ':' + msg)
    var rc = this.items.length
    this.items = []
    return rc
  }
}
module.exports = {
  name:"batchy",
  config,
  QueryBatch:QueryBatch,
  Batch:Batch
}
