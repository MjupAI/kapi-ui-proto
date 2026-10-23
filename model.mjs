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
export function safeArtifact(href) {
 return typeof href==='string'&&/^\/samples\/[a-z0-9-]+\.html$/.test(href)?href:'';
}
