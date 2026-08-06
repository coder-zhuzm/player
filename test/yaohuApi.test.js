import test from 'node:test';
import assert from 'node:assert/strict';

import { getSongDetail, searchSongs } from '../src/lib/yaohuApi.js';

globalThis.localStorage = {
  getItem: () => 'test-key',
  setItem: () => {}
};

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data)
  };
}

function mockFetch(responses, requestedUrls) {
  globalThis.fetch = async url => {
    requestedUrls.push(String(url));
    const response = responses.shift();
    assert.ok(response, `unexpected request: ${url}`);
    return jsonResponse(response);
  };
}

test('QQ keeps mid from search and uses it with the aggregate lyric API', async () => {
  const urls = [];
  mockFetch([
    { code: 200, data: { songs: [{ n: 1, name: '微光', singer: '洛天依', mid: '003kfFex37Ld2s' }] } },
    { code: 200, data: { name: '微光', musicurl: 'https://audio.example/qq.m4a' } },
    { code: 200, data: { lrc: '[00:01.00]第一句' } }
  ], urls);

  const search = await searchSongs('微光', 'qq', 5);
  assert.equal(search.songs[0].mid, '003kfFex37Ld2s');
  assert.equal(new URL(urls[0]).searchParams.has('g'), false);

  const detail = await getSongDetail(search.songs[0], 'qq');
  assert.equal(detail.song.url, 'https://audio.example/qq.m4a');
  assert.deepEqual(detail.song.lyrics, [{ time: 1, text: '第一句' }]);
  assert.match(urls[2], /\/lrc\?/);
  assert.match(urls[2], /mid=003kfFex37Ld2s/);
  assert.match(urls[2], /type=qq/);
});

test('search count is only sent to sources whose live endpoint accepts g', async () => {
  const urls = [];
  mockFetch([
    { code: 200, data: { songs: [{ n: 1, name: '一' }, { n: 2, name: '二' }] } }
  ], urls);

  const search = await searchSongs('测试', 'wy', 1);
  assert.equal(new URL(urls[0]).searchParams.get('g'), '1');
  assert.equal(search.songs.length, 1);
});

test('Kuwo uses RID detail mode, nested audio URL, and type=kw for lyrics', async () => {
  const urls = [];
  mockFetch([
    { code: 200, data: { vipmusic: { url: 'https://audio.example/kuwo.flac' } } },
    { code: 200, data: { lrc: '[00:02.50]酷我歌词' } }
  ], urls);

  const detail = await getSongDetail({ name: '晴天', rid: '123456', n: 1 }, 'kuwo');
  assert.equal(detail.song.url, 'https://audio.example/kuwo.flac');
  assert.deepEqual(detail.song.lyrics, [{ time: 2.5, text: '酷我歌词' }]);
  assert.equal(new URL(urls[0]).searchParams.get('msg'), '晴天');
  assert.match(urls[0], /action=song/);
  assert.match(urls[0], /id=123456/);
  assert.match(urls[1], /type=kw/);
});

test('NetEase prefers embedded timestamp lyrics and does not make a redundant request', async () => {
  const urls = [];
  mockFetch([
    {
      code: 200,
      data: {
        name: '测试歌曲',
        picture: 'https://image.example/cover.jpg',
        musicurl: 'https://audio.example/wy.mp3',
        lrctxt: '[00:03.00]网易歌词',
        lrc: 'https://api.yaohud.cn/api/music/lrc?mid=42&type=wy'
      }
    }
  ], urls);

  const detail = await getSongDetail({ name: '测试歌曲', n: 1 }, 'wy');
  assert.equal(detail.song.cover, 'https://image.example/cover.jpg');
  assert.deepEqual(detail.song.lyrics, [{ time: 3, text: '网易歌词' }]);
  assert.equal(urls.length, 1);
});
