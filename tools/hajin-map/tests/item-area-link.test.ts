import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemArea } from '../src/map/item-area-link.ts';
test('item area query is bounded, unique and inert',()=>{
 assert.equal(parseItemArea('?tool=explore&area=Chang-san%20Air%20Base'),'Chang-san Air Base');
 assert.equal(parseItemArea('?area=%20Songdo%20Wharf%20'),'Songdo Wharf');
 for(const search of ['', '?area=', '?area=%20', '?area=A&area=B', '?area=%00', '?area='+ 'a'.repeat(121), '?area='+ 'a'.repeat(2050)])assert.equal(parseItemArea(search),null);
 assert.equal(parseItemArea('?area=%3Cscript%3E'),'<script>'); // Text only; DOM uses textContent.
});
