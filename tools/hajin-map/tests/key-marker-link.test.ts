import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKeyMarkerTarget} from '../src/map/key-marker-link.ts';
test('106 key marker target admits only bounded exact captured-provider identities',()=>{
 assert.deepEqual(parseKeyMarkerTarget('?key-source=codcentral&key-marker=key-counting-room-vault'),{sourceId:'codcentral',recordId:'key-counting-room-vault'});
 for(const q of ['','?key-source=other&key-marker=key-test','?key-source=codcentral&key-source=codcentral&key-marker=key-test','?key-source=codcentral&key-marker=key-a&key-marker=key-b','?key-source=codcentral&key-marker=key-%3Cscript%3E','?key-source=codcentral&key-marker=key-%00','x'.repeat(4097)])assert.equal(parseKeyMarkerTarget(q),null);
});
