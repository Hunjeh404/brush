import 'fake-indexeddb/auto';
import test from 'node:test';import assert from 'node:assert/strict';
import {openDB,readState,writeState,createAuth,verifyPassword} from '../db.js';
import {defaultState} from '../core.js';
test('durable write and concurrent-tab revision guard',async()=>{await openDB();const s=defaultState();assert.equal(await writeState(s,0),1);assert.equal((await readState()).revision,1);await assert.rejects(writeState({...s,coins:999},0),/다른 창/);assert.equal((await readState()).coins,0);});
test('parent password is salted and recovery is independently verifiable',async()=>{const {auth,recovery}=await createAuth('parent-123');assert.notEqual(auth.hash,'parent-123');assert.equal(await verifyPassword(auth,'parent-123'),true);assert.equal(await verifyPassword(auth,'wrong'),false);assert.equal(await verifyPassword(auth,recovery,true),true);assert.equal(await verifyPassword(auth,recovery,false),false);});
