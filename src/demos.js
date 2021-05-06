/**
 * https://hackernoon.com/use-indexeddb-with-idb-a-1kb-library-that-makes-it-easy-8p1f3yqq
 */

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
                db.createObjectStore("store3", { keyPath: "id" });
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
    },
    async "demo5: retrieve values"() {
        const db2 = await openDB('db2', 1);
        // retrieve by key:
        db2.get('store3', 'cat001').then(console.log);
        // retrieve all:
        db2.getAll('store3').then(console.log);
        // count the total number of items in a store:
        db2.count('store3').then(console.log);
        // get all keys:
        db2.getAllKeys('store3').then(console.log);
        db2.close()
    },
    // Use db.put() instead of db.add() if you want to update / overwrite an existing value.
    // If the value didn't exist before, it'd be the same as add().
    async "demo6: overwrite values with the same key"() {
        // set db1/store1/delivered to be false;
        const db1 = await openDB('db1', 1);
        db1.put('store1', false, 'delivered');
        db1.close();
        // replace cat001 with a supercat:
        const db2 = await openDB('db2', 1);
        db2.put('store3', { id: 'cat001', strength: 99, speed: 99 });
        db2.close();
    },

    /**
     * Transactions:
        In database terms, 
        a "transaction" means several operations are executed as a group, 
        changes to the database only get committed if all steps are successful. 
        If one fails, the whole group is aborted. 
        The classic example is a transaction of 1000 dollars between two bank accounts, 
        where A+=1000 and B-=1000 must both succeed or both fail.
     * Every operation in IndexedDB must belong to a transaction.
     */
    async "demo7: move supercat: 2 operations in 1 transaction"() {
        /**
         * You first open a transaction with db.transaction(),
         *  and declare which stores are involved in this transaction.
         *  Notice the second argument 'readwrite', 
         * which means this transaction has permission to both read and write. 
         * If all you need is read, use 'readonly' instead (it's also the default).
         * ================================
         * After the transaction is opened, 
         * you can't use any of the previous methods we showed before, 
         * because those were shortcuts that encapsulate a transaction containing
         *  only one action. 
         * Instead, you do your actions using transaction.objectStore(storeName).methodName(..). Arguments are the same, 
         * except the first argument (the storeName) is moved forward to .objectStore(storeName). 
         * ("objectStore" is the official term for a "store")
         * ================================
         * Readonly is faster than readwrite, 
         * because each store will only perform one readwrite transaction at a time, 
         * during which the store is locked, 
         * whereas multiple readonly transactions will execute at the same time.
         */
        const db2 = await openDB('db2', 1);
        // open a new transaction, declare which stores are involved:
        let transaction = db2.transaction(["store3", "store4"], "readwrite");
        // do multiple things inside the transaction, if one fails all fail:
        let superCat = await transaction.objectStore('store3').get("cat001");
        transaction.objectStore('store3').delete('cat001');
        transaction.objectStore('store4').add(superCat);
        db2.close();
    },
    async "demo8: transaction on a single store, and error handling"() {
        // we'll only operate on one store this time:
        const db1 = await openDB('db1', 1);
        // this is equal to db1.transaction(["store2"], "readwrite");
        let transaction = db1.transaction('store2', 'readwrite');
        // this is equal to transaction.objectStore('store2').add(..)
        transaction.store.add('foo', 'foo');
        transaction.store.add('bar', 'bar');
        // monitor if the transaction was successful:
        /**
         * we monitor the promise transaction.done, 
         * which tells us whether the transaction succeeded or failed.
         *  Demo8 adds some data into store2, 
         * and you can run it twice to see one success and one fail in console log (fail because keys need to be unique).





A transaction will auto commit itself when it runs out of things to do, `transaction.done` is a nice thing to monitor, but not required.
         */
        transaction.done
            .then(() => {
                console.log('All steps succeeded, changes comitted');
            })
            .catch(() => {
                console.log('Something went wrong, transaction aborted');
            });
        db1.close();
    },
    // ===================================================
    // DB versioning and store creation:
    /**
     *  IndexedDB enforces a version system: 
     *      each db must exist as a db name paired with a version number, 
     *      in DevTools you can see db1 and db2 are both at version 1.
     *       Whenever you call openDB(), you must supply a positive integer as the version number.
     *       If this integer is greater than the existing one in the browser, 
     * you can provide a callback named upgrade, and it'll fire. 
     * If the DB doesn't exist in the browser, the user's version will be 0, 
     * so the callback will also fire.
     */
    async "demo9: very explicity create a new db and new store"() {
        // The upgrade callback is the only place where you can create and delete stores.
        /**
         * The upgrade callback is a transaction itself.
         *  It's not 'readonly' or 'readwrite', 
         * but a more powerful transaction type called 'versionchange', 
         * in which you have the permission to do anything, including readwrite to any stores, 
         * as well as create/delete stores. Since it's a big transaction itself, 
         * don't use single-action transaction wrappers like db.add() inside it, 
         * use the transaction object provided as an argument for you .
         */
        const db3 = await openDB('db3', 1, {
            upgrade: (db, oldVersion, newVersion, transaction) => {
                if (oldVersion === 0) upgradeDB3fromV0toV1();

                function upgradeDB3fromV0toV1() {
                    db.createObjectStore('moreCats', { keyPath: 'id' });
                    generate100cats().forEact(cat => {
                        transaction.objectStore('moreCats').add(cat);
                    })
                }
            }
        });
        db3.close();
    },
    async "demo10: handle both upgrade: 0 -> 2 and 1 -> 2"() {
        const db3 = await openDB('db3', 2, {
            upgrade: (db, oldVersion, newVersion, transaction) => {
                switch (oldVersion) {
                    case 0:
                        upgradeDB3fromV0toV1();
                    // `// falls through` means "don't break". 
                    // Adding this line of comment will prevent eslint from nagging you to add a break.
                    // falls through
                    case 1:
                        upgradeDB3fromV1toV2();
                        break;
                    default:
                        console.error('unknown db version');
                }
                function upgradeDB3fromV0toV1() {
                    db.createObjectStore('moreCats', { keyPath: 'id' });
                    generate100cats().forEact(cat => {
                        transaction.objectStore('moreCats').add(cat);
                    })
                }
                function upgradeDB3fromV1toV2() {
                    db.createObjectStore('userPreference');
                    transaction.objectStore('userPreference').add(false, 'userDarkMode');
                    transaction.objectStore('userPreference').add(25, 'resultsPerPage');

                }
            }

        });
        db3.close();
    },
    // ===============================
    /**
     *  a version change is the only place where you can create or delete stores,
     *  but there are often other scenarios when a version change is good choice even if you don't need to add / delete stores.
     */
    // ================================
    async "demo11: upgrade db version even when no schema change is needed"() {
        const db3 = await openDB('db3', 3, {
            upgrade: async (db, oldVersion, newVersion, transaction) => {
                switch (oldVersion) {
                    case 0:
                        upgrafeDB3fromV0toV1();
                    // falls through
                    case 1:
                        upgradeDB3fromV1toV2();
                    // falls through
                    case 2:
                        await upgradeDB3fromV2toV3();
                        break;
                    default:
                        console.error('unknown db version')
                }

                function upgradeDB3fromV0toV1() {
                    db.createObjectStore('moreCats', { keyPath: 'id' });
                    generate100cats().forEach(cat => {
                        transaction.objectStore('moreCats').add(cat);
                    });
                }
                function upgradeDB3fromV1toV2() {
                    db.createObjectStore('userPreference');
                    transaction.objectStore('userPreference').add(false, 'useDarkMode');
                    transaction.objectStore('userPreference').add(25, 'resultsPerPage');
                }
                async function upgradeDB3fromV2toV3() {
                    const store = transaction.objectStore('userPreference');
                    store.put('English', 'language');
                    store.delete('resultsPerPage');
                    let colorTheme = 'automatic';
                    let useDarkMode = await store.get('useDarkMode');
                    if (oldVersion === 2 && useDarkMode === false) colorTheme = 'light';
                    if (oldVersion === 2 && useDarkMode === true) colorTheme = 'dark';
                    store.put(colorTheme, 'colorTheme');
                    store.delete('useDarkMode');
                }
            },
        });
        db3.close();
    },
    // in IndexedDB, an index is just another store.
    // It's a "shadow store" that's based off of the main store,
    // let's see what it looks like:
    async "demo12: create an index on the 100 cats' strength"() {
        /**
         *  In DevTools, you can see the strengthIndex store has the same 100 cats as the main store, 
         * only the keys are different - that's exactly what an index is: 
         * a store with same values but different keys. 
         * Now you can retrieve values from it by using the new keys,
         * but you can't make changes to it because it's just a shadow. 
         * The shadow auto changes when the main store changes.
         * ============================
         * Adding an index is like creating the same store with a different 'keyPath'. 
         * Just like how the main store is constantly sorted by the main key, 
         * the index store is auto sorted by its own key.
         */
        const db3 = await openDB('db3', 4, {
            upgrade: (db, oldVersion, newVersion, transaction) => {
                // upgrade to v4 in a less careful manner:
                const store = transaction.objectStore('moreCats');
                store.createIndex('strengthIndex', 'strength');
            }
        });
        db3.close();
    },
    async "demo13: get values from index by key"() {
        const db3 = await openDB('db3', 4);
        const transaction = db3.transaction('moreCats');
        const strengthIndex = transaction.store.index('strengthIndex');
        // get all entries where the key is 10:
        let strongestCats = await strengthIndex.getAll(10);
        console.log('strongest cats: ', strongestCats);
        // get the first entry where the key is 10:
        let oneStrongCat = await strengthIndex.get(10);
        console.log('a strong cat: ', oneStrongCat);
        db3.close();
    },
    async "demo14: get values from index by key using shorcuts"() {
        const db3 = await openDB('db3', 4);
        // do similar things as demo13, but use single-action transaction shortcuts:
        let weakestCats = await db3.getAllFromIndex('moreCats', 'strengthIndex', 0);
        console.log('weakest cats: ', weakestCats);
        let oneWeakCat = await db3.getFromIndex('moreCats', 'strengthIndex', 0);
        console.log('a weak cat: ', oneWeakCat);
        db3.close();
    },
    async "demo15: find items matching a condition by using range"() {
        const db3 = await openDB('db3', 4);
        // create some ranges. note that IDBKeyRange is a native browser API,
        // it's not imported from idb, just use it:
        const strongRange = IDBKeyRange.lowerBound(8);
        const midRange = IDBKeyRange.bound(3, 7);
        const weakRange = IDBKeyRange.upperBound(2);
        let [strongCats, ordinaryCats, weakCats] = [
            await db3.getAllFromIndex('moreCats', 'strengthIndex', strongRange),
            await db3.getAllFromIndex('moreCats', 'strengthIndex', midRange),
            await db3.getAllFromIndex('moreCats', 'strengthIndex', weakRange),
        ];
        console.log('strong cats (strength >= 8): ', strongCats);
        console.log('ordinary cats (strength from 3 to 7): ', ordinaryCats);
        console.log('weak cats (strength <=2): ', weakCats);
        db3.close();
    },
    // ====================
    /**
     * To avoid using too much memory, 
     * IndexedDB provides a tool called a cursor, 
     * which is used to loop over a store directly.
     *  A cursor is like a pointer that points to a position in a store,
     *  you can read the record at that position, 
     * then advance the position by 1, then read the next record, and so on. Let's take a look:
     */
    // ================
    async "demo16: loop over the store with a cursor"() {
        const db3 = await openDB('db3', 4);
        // open a 'readonly' transaction:
        let store = db3.transaction('moreCats').store;
        // create a cursor, inspect where it's pointing at:
        let cursor = await store.openCursor();
        console.log('cursor.key: ', cursor.key);
        console.log('cursor.value: ', cursor.value);
        // move to next position:
        cursor = await cursor.continue();
        // inspect the new position:
        console.log('cursor.key: ', cursor.key);
        console.log('cursor.value: ', cursor.value);

        // keep moving until the end of the store
        // look for cats with strength and speed both greater than 8
        while (true) {
            const { strength, speed } = cursor.value;
            if (strength >= 8 && speed >= 8) {
                console.log('found a good cat! ', cursor.value);
            }
            cursor = await cursor.continue();
            if (!cursor) break;
        }
        db3.close();
    },
    async "demo17: use cursor on a range and/or on and index"() {
        const db3 = await openDB('db3', 4);
        let store = db3.transaction('moreCats').store;
        // create a cursor on a very small range:
        const range = IDBKeyRange.bound('cat042', 'cat045');
        let cursor1 = await store.openCursor(range);
        // loop over the range:
        while (true) {
          console.log('cursor1.key: ', cursor1.key);
          cursor1 = await cursor1.continue();
          if (!cursor1) break;
        }
        console.log('------------');
        // create a cursor on an index:
        let index = db3.transaction('moreCats').store.index('strengthIndex');
        let cursor2 = await index.openCursor();
        // cursor.key will be the key of the index:
        console.log('cursor2.key:', cursor2.key);
        // the primary key will be located in cursor.primaryKey:
        console.log('cursor2.primaryKey:', cursor2.primaryKey);
        // it's the first item in the index, so it's a cat with strength 0
        console.log('cursor2.value:', cursor2.value);
        db3.close();
    }
}

function generate100cats() {
    return new Array(100).fill().map((item, index) => {
        let id = 'cat' + index.toString().padStart(3, '0');
        let strength = Math.round(Math.random() * 100);
        let speed = Math.round(Math.random() * 100);
        return { id, strength, speed };
    })
}