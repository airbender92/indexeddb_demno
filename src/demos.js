import { openDB } from 'idb'

export const demos = {
    "demo1: Getting started"() {
        // the project is big and complicated, 
        // and you organize things into different stores under different DBs 
        openDB("db1", 1, {
            upgrade(db) {
                db.createObjectStore("store1");
                db.createObjectStore("store2");
            }
        });
        openDB("db2", 1, {
            upgrade(db) {
                db.createObjectStore("store3", { keyPath: "id"});
                db.createObjectStore("store4", { autoIncrement: true })
            }
        })
    },
    
    async "demo2: add some data into db1/store1/"() {
        // when you need to do something to a store, you first need to "connect to the db" by calling openDB(), 
        // which returns the db object, then you can call its methods
        const db1 = await openDB('db1', 1);
        db1.add('store1', 'hello world', 'message');
        db1.add('store1', true, 'delivered');
        db1.close();
    },
    async "demo3: error handling"() {
        // db.clear(storeName)
        // db.delete(storeName, keyName)
        const db1 = await openDB('db1', 1);
        db1
          .add('store1', 'hello again!!', 'new message')
          .then(result => {
              console.log('success!', result);
          })
          .catch(err => {
              console.log('error', err)
          });
          db1.close();
    },
    async "demo4: auto generate keys"() {
        const db2 = await openDB('db2', 1);
        db2.add('store3', { id: 'cat001', strength: 10, speed: 10 });
        db2.add('store3', { id: 'cat002', strength: 11, speed: 9 });
        db2.add('store4', { id: 'cat003', strength: 8, speed: 12 });
        db2.add('store4', { id: 'cat004', strength: 12, speed: 13 });
        db2.close();
    }
}