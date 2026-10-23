export function decisionFor(w) {
 const f=w.user_fields||w, status=f.status||w.mcp_status;
 if(w.entity_type!=='pipeline_case'||w.archived||w.deleted||w.business_accepted||!['pending','in_progress','blocked'].includes(status))return null;
 const lines=String(f.note||'').split(/\r?\n/);
 if(lines[0]!=='【判断待ち】池田')return null;
 const labels=[['判断内容','question'],['推奨','recommendation'],['未決の影響','impact'],['判断元','source']];
 const out={judge:'池田',question:'',recommendation:'',impact:'',source:''};
 for(const [i,[label,key]] of labels.entries()){
  const prefix='【'+label+'】'; if(!lines[i+1]?.startsWith(prefix))return null;
  out[key]=lines[i+1].slice(prefix.length).trim();
 }
 out.sourceText=out.source;
 if(!/^https:\/\/discord\.com\/channels\/[0-9]+\/[0-9]+\/[0-9]+$/.test(out.source))out.source='';
 return out;
}
export function project(rows) {
 return rows.filter(w=>!w.archived&&!w.deleted).map(w=>{
  const d=decisionFor(w);
  return {...w, decision:d, state:d?'decision':w.state==='decision'?'blocked':w.state, owner:w.assignee||'未設定', now:w.current||'確認中', nextStep:w.next||'確認中'};
 });
}
export function searchWorks(rows, query) {
 const q=String(query||'').trim().toLocaleLowerCase();
 return rows.filter(w=>!q||[w.title,w.assignee,w.owner,w.current,w.now,w.next,w.nextStep,w.project,...Object.values(decisionFor(w)||{})].join(' ').toLocaleLowerCase().includes(q));
}
// Only explicit completion is moved down. No progress inference.
export function localToday() {
 const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function priority(w,today=localToday()) {
 const due=/^\d{4}-\d{2}-\d{2}$/.test(w.due||'')?w.due:'';
 const limit=new Date(today+'T12:00:00');limit.setDate(limit.getDate()+7);
 const end=`${limit.getFullYear()}-${String(limit.getMonth()+1).padStart(2,'0')}-${String(limit.getDate()).padStart(2,'0')}`;
 return [w.state==='done'?5:due&&due<=end?0:w.state==='blocked'?1:w.state==='decision'?2:due?3:4,due||'9999-99-99'];
}
export function hierarchy(rows,today=localToday()) {
 const nodes=new Map(rows.map((w,index)=>[w.id,{work:w,index,children:[]}])),roots=[];
 for(const n of nodes.values()) {
  let p=nodes.get(n.work.parent_id),cursor=p;const seen=new Set([n.work.id]);let cycle=false;
  while(cursor){if(seen.has(cursor.work.id)){cycle=true;break;}seen.add(cursor.work.id);cursor=nodes.get(cursor.work.parent_id);}
  if(p&&!cycle)p.children.push(n);else {n.parentIssue=cycle?'循環する親子関係':n.work.parent_id?'親が表示対象にありません':'';roots.push(n);}
 }
 const cmp=(a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]);
 function decorate(n){n.children.forEach(decorate);n.count=1+n.children.reduce((s,c)=>s+c.count,0);n.stopped=(['blocked','decision'].includes(n.work.state)?1:0)+n.children.reduce((s,c)=>s+c.stopped,0);n.key=[priority(n.work,today),...n.children.map(c=>c.key)].sort(cmp)[0];n.children.sort((a,b)=>cmp(a.key,b.key)||a.index-b.index);return n;}
 roots.forEach(decorate);
 const groups=new Map();
 for(const n of roots){const w=n.work,key=w.business_id||w.project||'';if(!groups.has(key))groups.set(key,{id:key,title:w.business_name||w.project||'所属の登録なし',nodes:[],count:0,stopped:0});const g=groups.get(key);g.nodes.push(n);g.count+=n.count;g.stopped+=n.stopped;}
 for(const g of groups.values()){g.nodes.sort((a,b)=>cmp(a.key,b.key)||a.index-b.index);g.key=g.nodes[0].key;}
 return [...groups.values()].sort((a,b)=>cmp(a.key,b.key));
}
export function safeArtifact(href) {
 return typeof href==='string'&&/^\/samples\/[a-z0-9-]+\.html$/.test(href)?href:'';
}
