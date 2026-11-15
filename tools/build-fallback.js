// Rebuilds assets/fallback.json from raw API responses saved in tools/api-snapshots/.
// Refresh the snapshots with curl (URLs in SUBMISSION.md), then: node tools/build-fallback.js assets/fallback.json
const fs=require('fs'),p=f=>__dirname+'/api-snapshots/'+f;
const txt=fs.readFileSync(p('horizons.txt'),'utf8');
const rows=txt.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(l=>{const m=l.trim().match(/^(\S+ \S+)\s+\S*\s+([\d.]+)\s+(-?[\d.]+)/);return {date:m[1].split(' ')[0],deltaAU:+m[2]};});
// Robot plates are pinned by NASA ID; the DSN plate comes from a text search.
const IMG={PIA24542:'img_PIA24542.json',PIA04413:'img_PIA04413.json',PIA04918:'img_PIA04918.json',PIA22876:'img_PIA22876.json',PIA23720:'img_PIA23720.json','deep space network antenna goldstone':'img_dsn.json'};
const images={};for(const [k,f] of Object.entries(IMG)){const j=JSON.parse(fs.readFileSync(p(f)));const it=j.collection.items[0];images[k]={title:it?.data?.[0]?.title||'',nasa_id:it?.data?.[0]?.nasa_id||'',date:(it?.data?.[0]?.date_created||'').slice(0,10),thumb:(it?.links?.[0]?.href||'').replace('~medium.','~small.')||null};}
const sbdb={};for(const a of ['433','101955','16']){const j=JSON.parse(fs.readFileSync(p('sbdb_'+a+'.json')));const el={};(j.orbit.elements||[]).forEach(e=>el[e.name]=e.value);sbdb[a]={name:j.object.fullname,kind:j.object.kind,a:el.a,e:el.e,i:el.i,per:el.per,epoch:j.orbit.epoch};}
const n=JSON.parse(fs.readFileSync(p('ntrs.json')));
const ntrs=n.results.slice(0,8).map(r=>({id:r.id,title:r.title,year:(r.publications?.[0]?.publicationDate||r.created||'').slice(0,4),url:'https://ntrs.nasa.gov/citations/'+r.id}));
const out={generated:new Date().toISOString(),
 horizons:{source:'JPL Horizons, COMMAND=499 CENTER=399 QUANTITIES=20, 7d step',rows},
 images,
 donki:{note:'DONKI FLR returned HTTP 404 for all ranges on 2026-11-14 (service outage at build time). Seeded with flares recorded in the DONKI catalog.',flares:[
  {beginTime:'2024-10-03T12:08Z',classType:'X9.0'},{beginTime:'2024-05-14T16:46Z',classType:'X8.7'},{beginTime:'2024-10-01T21:58Z',classType:'X7.1'},{beginTime:'2024-05-11T01:10Z',classType:'X5.8'},{beginTime:'2023-12-14T16:47Z',classType:'X2.8'},{beginTime:'2024-02-22T22:08Z',classType:'X6.3'}]},
 sbdb, ntrs,
 nasa3d:{note:'Not fetched: optional, cut per build order.',items:[]}};
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log(JSON.stringify({rows:rows.length,images:Object.values(images).map(x=>!!x.thumb),sbdb:Object.values(sbdb).map(x=>x.name+' a='+x.a),ntrs:ntrs.map(x=>x.year+' '+x.title.slice(0,70))},null,1));
